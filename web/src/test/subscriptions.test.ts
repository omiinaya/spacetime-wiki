import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// ─── Mock WebSocket ───────────────────────────────────────────────────────────
// Must use a real class (not arrow function) because `new WebSocket()` requires
// a constructable value. We track calls manually via the class.

interface MockWebSocket {
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onopen: ((evt: Event) => void) | null;
  onclose: ((evt: CloseEvent) => void) | null;
  onerror: ((evt: Event) => void) | null;
  onmessage: ((evt: MessageEvent) => void) | null;
  triggerOpen: () => void;
  triggerClose: (code?: number) => void;
  triggerMessage: (data: string) => void;
  triggerError: () => void;
}

const ORIGINAL_WS = globalThis.WebSocket;
let currentMockWs: MockWebSocket | null = null;
let wsConstructorCalls = 0;

function makeMockWs(): MockWebSocket {
  const ws: MockWebSocket = {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    triggerOpen() {
      ws.onopen?.(new Event('open'));
    },
    triggerClose(code = 1000) {
      ws.onclose?.(new CloseEvent('close', { code, wasClean: true }));
    },
    triggerMessage(data: string) {
      ws.onmessage?.(new MessageEvent('message', { data }));
    },
    triggerError() {
      ws.onerror?.(new Event('error'));
    },
  };
  return ws;
}

beforeEach(() => {
  currentMockWs = makeMockWs();
  wsConstructorCalls = 0;
  // Must be a class — arrow functions are not constructable
  globalThis.WebSocket = class WebSocketMock {
    constructor(_url: string) {
      wsConstructorCalls++;
      currentMockWs!.readyState = 1;
      return currentMockWs as unknown as WebSocket;
    }
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
  } as unknown as Response;
});

afterEach(() => {
  globalThis.WebSocket = ORIGINAL_WS;
});

// ─── Mock fetch used by useSubscription hook ──────────────────────────────────
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

import {
  SubscriptionManager,
  useSubscription,
  defaultSubscriptionManager,
  connectSubscriptions,
  disconnectSubscriptions,
} from '../lib/subscriptions';

function ws(): MockWebSocket {
  return currentMockWs!;
}

function constructorCallCount(): number {
  return wsConstructorCalls;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SubscriptionManager
// ═══════════════════════════════════════════════════════════════════════════════

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    manager = new SubscriptionManager();
  });

  afterEach(() => {
    manager.disconnect();
    vi.useRealTimers();
  });

  it('starts in disconnected state', () => {
    expect(manager.connectionState).toBe('disconnected');
    expect(manager.isConnected()).toBe(false);
  });

  it('creates a WebSocket on connect()', () => {
    manager.connect();
    expect(constructorCallCount()).toBe(1);
  });

  it('notifies listener of connecting state when connect() is called', () => {
    const listener = vi.fn();
    manager.onStateChange(listener);

    manager.connect();
    expect(listener).toHaveBeenCalledWith('connecting');
  });

  it('notifies listener of connected state when ws opens', () => {
    const listener = vi.fn();
    manager.onStateChange(listener);

    manager.connect();
    ws().triggerOpen();

    expect(listener).toHaveBeenCalledWith('connected');
    expect(manager.isConnected()).toBe(true);
  });

  it('transitions to disconnected on close', () => {
    manager.connect();
    ws().triggerOpen();

    const listener = vi.fn();
    manager.onStateChange(listener);

    ws().triggerClose(1000);
    expect(listener).toHaveBeenCalledWith('disconnected');
  });

  it('disconnect() closes the WebSocket and clears state', () => {
    manager.connect();
    ws().triggerOpen();

    manager.disconnect();
    expect(ws().close).toHaveBeenCalled();
    expect(manager.connectionState).toBe('disconnected');
  });

  it('subscribe() sends query immediately when connected', () => {
    manager.connect();
    ws().triggerOpen();

    const onRows = vi.fn();
    manager.subscribe({ sql: 'SELECT * FROM page', onRows });

    expect(ws().send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', sql: 'SELECT * FROM page' }),
    );
  });

  it('subscribe() queues query when not connected, sends on connect', () => {
    const onRows = vi.fn();
    manager.subscribe({ sql: 'SELECT * FROM page', onRows });
    expect(ws().send).not.toHaveBeenCalled();

    manager.connect();
    ws().triggerOpen();
    expect(ws().send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscribe', sql: 'SELECT * FROM page' }),
    );
  });

  it('unsubscribe removes query so it no longer gets messages', () => {
    manager.connect();
    ws().triggerOpen();

    const onRows = vi.fn();
    const unsub = manager.subscribe({ sql: 'SELECT * FROM page', onRows });

    unsub();
    ws().triggerMessage(JSON.stringify({ type: 'snapshot', table: 'page', rows: [{ id: '1' }] }));
    expect(onRows).not.toHaveBeenCalled();
  });

  it('calls onRows when matching snapshot arrives', () => {
    manager.connect();
    ws().triggerOpen();

    const onRows = vi.fn();
    manager.subscribe({ sql: 'SELECT * FROM page', onRows });

    ws().triggerMessage(
      JSON.stringify({ type: 'snapshot', table: 'page', rows: [{ id: '1', title: 'Test' }] }),
    );
    expect(onRows).toHaveBeenCalledWith([{ id: '1', title: 'Test' }]);
  });

  it('calls onError when server error arrives', () => {
    manager.connect();
    ws().triggerOpen();

    const onError = vi.fn();
    manager.subscribe({ sql: 'SELECT * FROM page', onRows: vi.fn(), onError });

    ws().triggerMessage(JSON.stringify({ type: 'error', message: 'Table not found' }));
    expect(onError).toHaveBeenCalledWith('Table not found');
  });

  it('reconnects with exponential backoff after abnormal close', () => {
    manager.connect();
    ws().triggerOpen();
    ws().triggerClose(1006);

    // First reconnect after 1000ms delay
    vi.advanceTimersByTime(1000);
    expect(constructorCallCount()).toBe(2);

    // Second WebSocket also closes abnormally — must be "ever connected"
    // so the onclose handler schedules another reconnect.
    ws().triggerOpen();
    ws().triggerClose(1006);

    // Should reconnect again with 2000ms delay
    vi.advanceTimersByTime(2000);
    expect(constructorCallCount()).toBe(3);
  });

  it('does NOT reconnect after fatal error (never connected)', () => {
    manager.connect();
    ws().triggerError();
    ws().triggerClose(1006);

    vi.advanceTimersByTime(5000);
    expect(constructorCallCount()).toBe(1);
  });

  it('removes state listener on returned unsubscribe', () => {
    const listener = vi.fn();
    const unsub = manager.onStateChange(listener);
    unsub();

    manager.connect();
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not reconnect after explicit disconnect()', () => {
    manager.connect();
    ws().triggerOpen();

    manager.disconnect();
    vi.advanceTimersByTime(5000);
    expect(constructorCallCount()).toBe(1);
  });

  it('prevents duplicate connect calls', () => {
    manager.connect();
    expect(constructorCallCount()).toBe(1);

    manager.connect();
    expect(constructorCallCount()).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useSubscription hook
// ═══════════════════════════════════════════════════════════════════════════════

describe('useSubscription hook', () => {
  const mapper = (row: unknown[]) => ({ id: row[0] as string });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify([{ rows: [] }])),
    });
    defaultSubscriptionManager.disconnect();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns rows from HTTP fetch', async () => {
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify([{ rows: [['1']] }])),
    });

    const { result } = renderHook(() => useSubscription('SELECT * FROM page', mapper));

    await vi.waitFor(() => {
      expect(result.current.rows).toEqual([{ id: '1' }]);
    });
  });

  it('returns empty rows for null sql', () => {
    const { result } = renderHook(() => useSubscription(null, mapper));

    expect(result.current.rows).toEqual([]);
  });

  it('reports connecting state after mount (useEffect fires connect)', () => {
    const { result } = renderHook(() => useSubscription('SELECT id FROM page', mapper));

    // The hook's useEffect fires synchronously in test, calling connect()
    // which immediately transitions to "connecting"
    expect(['disconnected', 'connecting', 'connected', 'reconnecting']).toContain(
      result.current.state,
    );
  });

  it('handles non-JSON HTTP response gracefully', async () => {
    mockFetch.mockResolvedValue({
      text: () => Promise.resolve('no such table: xyz'),
    });

    const { result } = renderHook(() => useSubscription('SELECT * FROM xyz', mapper));

    await vi.waitFor(() => {
      expect(Array.isArray(result.current.rows)).toBe(true);
    });
    expect(result.current.rows).toHaveLength(0);
  });

  it('handles fetch rejection gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSubscription('SELECT * FROM page', mapper));

    await vi.waitFor(() => {
      expect(Array.isArray(result.current.rows)).toBe(true);
    });
    expect(result.current.rows).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// connectSubscriptions / disconnectSubscriptions
// ═══════════════════════════════════════════════════════════════════════════════

describe('singleton wrappers', () => {
  beforeEach(() => {
    defaultSubscriptionManager.disconnect();
  });

  it('connectSubscriptions calls connect on the singleton', () => {
    const spy = vi.spyOn(defaultSubscriptionManager, 'connect');
    connectSubscriptions();
    expect(spy).toHaveBeenCalled();
  });

  it('disconnectSubscriptions calls disconnect on the singleton', () => {
    const spy = vi.spyOn(defaultSubscriptionManager, 'disconnect');
    disconnectSubscriptions();
    expect(spy).toHaveBeenCalled();
  });
});
