/**
 * Yjs‑STDB Collaboration Provider
 *
 * Bridges Yjs (CRDT) with SpacetimeDB for real-time multi-user co-editing.
 *
 * How it works:
 * 1. On mount, fetch all existing Yjs updates for the page from STDB (collab_update table)
 *    and apply them to a local Yjs.Doc to reconstruct the full document state.
 * 2. Subscribe to the STDB `collab_update` table for the page — any new updates
 *    are applied to the Yjs.Doc immediately.
 * 3. Register an observer on the Yjs.Doc — when the local user makes edits,
 *    broadcast the encoded update to STDB via the `broadcast_yjs_update` reducer.
 * 4. Manage awareness (cursor presence) via the `collab_session` table.
 * 5. Expose a y-protocols Awareness instance for Tiptap v3 CollaborationCursor.
 */

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { api, type CollabUpdate } from './api';

const COLLAB_COLORS = [
  '#4A90D9',
  '#E8734A',
  '#50B86C',
  '#D94A8C',
  '#B87D4A',
  '#6B5B95',
  '#D4A843',
  '#4AB8B8',
  '#B84A6B',
  '#5B8C5B',
  '#8C5B8C',
  '#B8B84A',
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

export class YjsStdbProvider {
  public doc: Y.Doc;
  /** y-protocols Awareness instance for Tiptap v3 CollaborationCursor */
  public awareness: Awareness;
  private pageId: string;
  private userId: string;
  private userName: string;
  private color: string;
  private broadcastDebounce: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private updateHandler: ((update: Uint8Array, origin: unknown) => void) | null = null;

  constructor(pageId: string, userId: string, userName: string) {
    this.doc = new Y.Doc();
    this.awareness = new Awareness(this.doc);
    this.pageId = pageId;
    this.userId = userId;
    this.userName = userName;
    this.color = getUserColor(userId);
  }

  /** Initialize: join session, fetch existing updates, start listening */
  async initialize(): Promise<void> {
    if (this.destroyed) return;

    // 1. Set local awareness state
    this.awareness.setLocalStateField('user', {
      name: this.userName,
      color: this.color,
    });

    // 2. Join the collaboration session
    await api.collaboration.joinSession(this.pageId, this.userId, this.userName, this.color);

    // 3. Fetch existing Yjs updates and apply them to reconstruct the doc state
    try {
      const updates = await api.collaboration.getUpdates(this.pageId);
      for (const upd of updates) {
        const binary = Uint8Array.from(atob(upd.update_data), (c) => c.charCodeAt(0));
        Y.applyUpdate(this.doc, binary);
      }
    } catch (err) {
      console.warn('YjsStdbProvider: failed to fetch existing updates', err);
    }

    // 4. Register observer to broadcast local edits
    this.updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === this || origin === 'remote') return; // ignore own broadcasts and remote updates
      this.scheduleBroadcast(update);
    };
    this.doc.on('update', this.updateHandler);
  }

  /** Schedule a debounced broadcast of a Yjs update */
  private scheduleBroadcast(update: Uint8Array): void {
    if (this.broadcastDebounce) clearTimeout(this.broadcastDebounce);
    this.broadcastDebounce = setTimeout(() => {
      if (this.destroyed) return;
      const base64 = btoa(String.fromCharCode(...update));
      api.collaboration.broadcastUpdate(this.pageId, base64, this.userId).catch((err) => {
        console.warn('YjsStdbProvider: broadcast failed', err);
      });
    }, 100);
  }

  /** Handle an incoming Yjs update from STDB (called by subscription) */
  applyRemoteUpdate(updateData: string): void {
    if (this.destroyed) return;
    try {
      const binary = Uint8Array.from(atob(updateData), (c) => c.charCodeAt(0));
      Y.applyUpdate(this.doc, binary, 'remote');
    } catch (err) {
      console.warn('YjsStdbProvider: applyRemoteUpdate failed', err);
    }
  }

  /** Update cursor position in STDB (debounced in caller) */
  updateCursor(cursorJson: string): void {
    if (this.destroyed) return;
    api.collaboration.updateCursor(this.pageId, this.userId, cursorJson).catch((err) => console.error("Cursor update failed:", err));
  }

  /** Get awareness data for other users on this page */
  async getOtherSessions(): Promise<
    { userId: string; userName: string; color: string; cursorPosition: string }[]
  > {
    try {
      const sessions = await api.collaboration.getSessions(this.pageId);
      return sessions
        .filter((s) => s.user_id !== this.userId)
        .map((s) => ({
          userId: s.user_id,
          userName: s.user_name,
          color: s.color,
          cursorPosition: s.cursor_position,
        }));
    } catch {
      return [];
    }
  }

  /** Cleanup: leave session, remove observers */
  destroy(): void {
    this.destroyed = true;
    if (this.updateHandler) {
      this.doc.off('update', this.updateHandler);
      this.updateHandler = null;
    }
    if (this.broadcastDebounce) {
      clearTimeout(this.broadcastDebounce);
      this.broadcastDebounce = null;
    }
    this.awareness.destroy();
    api.collaboration.leaveSession(this.pageId, this.userId).catch((err) => console.error("Failed to leave session:", err));
  }
}
