// ─── Real-time STDB Subscriptions ────────────────────────────────────────────
// Provides a lightweight subscription layer using STDB's WebSocket subscribe
// endpoint (/v1/database/{db_id}/subscribe). Supports table-level subscriptions
// with automatic reconnection and callback-based row updates.
//
// This is an incremental replacement for HTTP-poll-based data loading.
// Currently used alongside the existing api.ts SQL call pattern.
//
// Usage:
//   const sub = new SubscriptionManager();
//   sub.subscribe("SELECT * FROM page", (rows) => { ... });
//   sub.connect();
//   // Later:
//   sub.disconnect();

import { useState, useEffect, useRef } from "react";

const STDB_HOST = "192.168.1.10:3001";
const DB_ID = "c2000df40a4560c4985121fce5ab36ba57e4d170e4fa08a5f00c85880b5102f0";
const WS_URL = `ws://${STDB_HOST}/v1/database/${DB_ID}/subscribe`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubscriptionQuery {
  sql: string;
  onRows: (rows: Record<string, unknown>[]) => void;
  onError?: (err: string) => void;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

// ─── Subscription Manager ────────────────────────────────────────────────────
// Manages a single WebSocket connection to STDB's subscribe endpoint.
// Supports multiple subscription queries sharing one connection.

export class SubscriptionManager {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private queries: SubscriptionQuery[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30_000;
  private everConnected = false;
  private consecutiveFailures = 0;
  private maxConsecutiveFailures = 3;
  private fatal = false;

  get connectionState(): ConnectionState {
    return this.state;
  }

  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private setState(newState: ConnectionState) {
    this.state = newState;
    for (const listener of this.stateListeners) {
      listener(newState);
    }
  }

  connect() {
    if (this.fatal) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.setState("connecting");
    try {
      this.ws = new WebSocket(WS_URL);
    } catch (err) {
      console.error("[STDB Sub] WebSocket creation failed:", err);
      this.setState("disconnected");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log("[STDB Sub] Connected to", WS_URL);
      this.setState("connected");
      this.everConnected = true;
      this.consecutiveFailures = 0;
      this.reconnectDelay = 1000;
      // Resubscribe all queries
      for (const q of this.queries) {
        this.ws?.send(JSON.stringify({ type: "subscribe", sql: q.sql }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "snapshot" || msg.type === "update") {
          // Route rows to matching subscribers
          // STDB returns { type: "snapshot"|"update", table: "page", rows: [...] }
          for (const q of this.queries) {
            // Simple heuristic: match by table name extracted from subscription SQL
            const tableName = extractTableName(q.sql);
            if (tableName && msg.table === tableName) {
              q.onRows(msg.rows || []);
            }
          }
        } else if (msg.type === "error") {
          console.error("[STDB Sub] Server error:", msg.message);
          for (const q of this.queries) {
            q.onError?.(msg.message || "Unknown error");
          }
        }
      } catch (err) {
        console.error("[STDB Sub] Failed to parse message:", err);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[STDB Sub] Disconnected (code=${event.code})`);
      this.setState("disconnected");
      this.ws = null;
      if (this.everConnected || this.consecutiveFailures < this.maxConsecutiveFailures) {
        this.consecutiveFailures++;
        this.scheduleReconnect();
      } else if (!this.fatal) {
        this.fatal = true;
        console.warn(
          `[STDB Sub] Stopped reconnecting after ${this.maxConsecutiveFailures} failures — ` +
          "the WebSocket subscribe endpoint may not be available on this STDB server. " +
          "Data still loads via HTTP."
        );
      }
    };

    this.ws.onerror = (event) => {
      console.error("[STDB Sub] WebSocket error:", event);
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this.setState("disconnected");
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = this.reconnectDelay;
    console.log(`[STDB Sub] Reconnecting in ${delay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.setState("reconnecting");
      this.connect();
    }, delay);
  }

  subscribe(query: SubscriptionQuery): () => void {
    this.queries.push(query);
    // If already connected, send subscription immediately
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", sql: query.sql }));
    }
    // Return unsubscribe function
    return () => {
      this.queries = this.queries.filter((q) => q !== query);
    };
  }

  isConnected(): boolean {
    return this.state === "connected";
  }
}

// ─── Singleton instance ──────────────────────────────────────────────────────

export const defaultSubscriptionManager = new SubscriptionManager();

// ─── React Hook ──────────────────────────────────────────────────────────────
// STDB returns rows as positional arrays (unknown[][]), not objects.
// The mapper receives each row as unknown[] and returns the typed result.

export function useSubscription<T>(
  sql: string | null,
  mapper: (row: unknown[]) => T,
  key?: string,
): { rows: T[]; connected: boolean; state: ConnectionState } {
  const [rows, setRows] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<ConnectionState>("disconnected");
  const rowsRef = useRef<T[]>([]);

  useEffect(() => {
    const unsubState = defaultSubscriptionManager.onStateChange((s) => {
      setState(s);
      setConnected(s === "connected");
    });

    // Connect on first hook mount
    if (defaultSubscriptionManager.connectionState === "disconnected") {
      defaultSubscriptionManager.connect();
    }

    return () => {
      unsubState();
    };
    // key allows hook to reconnect when the identity changes (e.g., different page ID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!sql) return;

    const unsub = defaultSubscriptionManager.subscribe({
      sql,
      onRows: (rawRows) => {
        const mapped = (rawRows as any as unknown[][]).map(mapper);
        rowsRef.current = mapped;
        setRows([...mapped]);
      },
      onError: (err) => console.error("[STDB Sub] Query error:", err, sql),
    });

    // Immediately fetch initial data via HTTP (until snapshot arrives)
    fetch(`http://${STDB_HOST}/v1/database/${DB_ID}/sql`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: sql,
    })
      .then((res) => res.text().then((text) => {
        // STDB may return non-JSON error messages (e.g. "no such table" or
        // syntax errors for tables that haven't been published yet).
        // Handle gracefully by using empty data.
        try {
          const data = JSON.parse(text);
          const initialRows = ((data[0]?.rows || []) as unknown[][]).map(mapper);
          rowsRef.current = initialRows;
          setRows([...initialRows]);
        } catch {
          console.warn("[STDB Sub] Non-JSON response, using empty data:", text.slice(0, 120));
        }
      }))
      .catch((err) => console.error("[STDB Sub] HTTP fetch failed:", err));

    return () => {
      unsub();
    };
    // key triggers re-subscribe when the identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sql, key]);

  return { rows, connected, state };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractTableName(sql: string): string | null {
  const match = sql.match(/FROM\s+`?(\w+)`?/i);
  return match ? match[1].toLowerCase() : null;
}

// ─── Export singleton for direct imperative use ──────────────────────────────

export function connectSubscriptions() {
  defaultSubscriptionManager.connect();
}

export function disconnectSubscriptions() {
  defaultSubscriptionManager.disconnect();
}
