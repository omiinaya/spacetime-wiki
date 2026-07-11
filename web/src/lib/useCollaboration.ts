/**
 * React hook for Yjs‑STDB real-time collaboration in Tiptap.
 *
 * Manages the Yjs document lifecycle, STDB sync, cursor awareness,
 * and provides the Tiptap Collaboration extensions configuration.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as Y from "yjs";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { YjsStdbProvider } from "./yjs-stdb-provider";
import { useCollabSessionsSubscription, useCollabUpdatesSubscription } from "./api";

interface RemoteUser {
  userId: string;
  userName: string;
  color: string;
  cursorPosition: string;
}

interface UseCollabResult {
  /** The Yjs document (shared between editor and provider) */
  ydoc: Y.Doc;
  /** The STDB-backed Yjs provider (for cursor updates) */
  provider: YjsStdbProvider;
  /** Tiptap Collaboration extension config – spread into extensions array */
  collaborationExtension: unknown;
  /** Tiptap CollaborationCursor extension config – spread into extensions array */
  collaborationCursorExtension: unknown;
  /** Other users currently editing this page */
  remoteUsers: RemoteUser[];
  /** Whether collaboration is active */
  isActive: boolean;
}

export function useCollaboration(
  pageId: string | undefined,
  userId: string | undefined,
  userName: string | undefined,
): UseCollabResult {
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [providerReady, setProviderReady] = useState(false);
  const providerRef = useRef<YjsStdbProvider | null>(null);
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const initializedRef = useRef(false);

  // Subscribe to other sessions on this page
  const { rows: sessions } = useCollabSessionsSubscription(pageId);

  // Subscribe to Yjs updates broadcast by other users
  const { rows: updates } = useCollabUpdatesSubscription(pageId);

  // Initialize provider when we have all the info
  useEffect(() => {
    if (!pageId || !userId || !userName) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const provider = new YjsStdbProvider(pageId, userId, userName);
    providerRef.current = provider;
    setProviderReady(true);
    provider.initialize().catch((err) => {
      console.warn("useCollaboration: failed to initialize", err);
    });

    return () => {
      provider.destroy();
      providerRef.current = null;
      initializedRef.current = false;
      setProviderReady(false);
    };
  }, [pageId, userId, userName]);

  // Apply remote Yjs updates as they arrive via STDB subscription
  useEffect(() => {
    if (!updates || !providerRef.current || !pageId) return;
    const provider = providerRef.current;
    for (const upd of updates) {
      provider.applyRemoteUpdate(upd.update_data);
    }
  }, [updates, pageId]);

  // Update remote users list from session subscription
  useEffect(() => {
    if (!sessions || !userId) {
      setRemoteUsers([]);
      return;
    }
    const others = sessions
      .filter((s: unknown) => s.user_id !== userId)
      .map((s: unknown) => ({
        userId: s.user_id,
        userName: s.user_name,
        color: s.color,
        cursorPosition: s.cursor_position,
      }));
    setRemoteUsers(others);
  }, [sessions, userId]);

  const ydoc = ydocRef.current;

  // Build Tiptap Collaboration extension config (v3 API)
  const collaborationExtension = Collaboration.configure({
    document: ydoc,
  });

  // Build CollaborationCursor extension config (v3 API)
  // Uses the provider's awareness if available, otherwise provides minimal noop
  const collaborationCursorExtension = CollaborationCursor.configure({
    provider: providerRef.current as unknown,
    user: {
      name: userName || "Unknown",
      color: userId ? getColorForUser(userId) : "#4A90D9",
    },
  });

  return {
    ydoc,
    provider: providerRef.current as unknown,
    collaborationExtension,
    collaborationCursorExtension,
    remoteUsers,
    // Only active once the async provider is initialized
    isActive: providerReady && !!pageId && !!userId && !!userName,
  };
}

// Color assignment helper (mirrors the one in the provider)
const COLLAB_COLORS = [
  "#4A90D9", "#E8734A", "#50B86C", "#D94A8C",
  "#B87D4A", "#6B5B95", "#D4A843", "#4AB8B8",
  "#B84A6B", "#5B8C5B", "#8C5B8C", "#B8B84A",
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}
