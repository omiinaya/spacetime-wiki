import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ─── Mock Yjs ────────────────────────────────────────────────────────────────
const mockYDocs: any[] = [];
vi.mock("yjs", () => {
  const Doc = function () {
    const doc = { on: vi.fn(), off: vi.fn(), getMap: vi.fn(), toJSON: vi.fn() };
    mockYDocs.push(doc);
    return doc;
  };
  return { Doc };
});

// ─── Mock Tiptap collaboration extensions ─────────────────────────────────────
vi.mock("@tiptap/extension-collaboration", () => ({
  default: { configure: vi.fn(() => ({ type: "collaboration" })) },
}));
vi.mock("@tiptap/extension-collaboration-cursor", () => ({
  default: { configure: vi.fn(() => ({ type: "collaborationCursor" })) },
}));

// ─── Mock YjsStdbProvider ────────────────────────────────────────────────────
const mockProviderInstances: any[] = [];
const MockProvider = vi.hoisted(() =>
  vi.fn().mockImplementation(function (this: any, pageId: string, userId: string, userName: string) {
    const inst = {
      pageId,
      userId,
      userName,
      doc: new (require("yjs").Doc)(),
      awareness: { setLocalStateField: vi.fn(), destroy: vi.fn() },
      initialize: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      applyRemoteUpdate: vi.fn(),
    };
    mockProviderInstances.push(inst);
    return inst;
  })
);

vi.mock("../lib/yjs-stdb-provider", () => ({
  YjsStdbProvider: MockProvider,
}));

// ─── Mock api hooks ──────────────────────────────────────────────────────────
const mockSessionsData = vi.hoisted(() => vi.fn());
const mockUpdatesData = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  useCollabSessionsSubscription: (pageId: string | undefined) => ({
    rows: mockSessionsData(pageId),
  }),
  useCollabUpdatesSubscription: (pageId: string | undefined) => ({
    rows: mockUpdatesData(pageId),
  }),
}));

// Import AFTER mocks
import { useCollaboration } from "../lib/useCollaboration";

// ═══════════════════════════════════════════════════════════════════════════════
// useCollaboration hook
// ═══════════════════════════════════════════════════════════════════════════════

describe("useCollaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionsData.mockReset();
    mockUpdatesData.mockReset();
    // Default: no sessions or updates
    mockSessionsData.mockReturnValue([]);
    mockUpdatesData.mockReturnValue([]);
    // Clear collected instances
    mockProviderInstances.length = 0;
    mockYDocs.length = 0;
  });

  it("returns isActive=false when pageId is undefined", () => {
    const { result } = renderHook(() =>
      useCollaboration(undefined, "user1", "Alice")
    );
    expect(result.current.isActive).toBe(false);
  });

  it("returns isActive=false when userId is undefined", () => {
    const { result } = renderHook(() =>
      useCollaboration("page1", undefined, "Alice")
    );
    expect(result.current.isActive).toBe(false);
  });

  it("returns isActive=false when userName is undefined", () => {
    const { result } = renderHook(() =>
      useCollaboration("page1", "user1", undefined)
    );
    expect(result.current.isActive).toBe(false);
  });

  it("creates a YjsStdbProvider when all params provided", async () => {
    const { result } = renderHook(() =>
      useCollaboration("page1", "user1", "Alice")
    );

    await vi.waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });
    expect(MockProvider).toHaveBeenCalledWith("page1", "user1", "Alice");
  });

  it("calls provider.initialize() on mount", async () => {
    const { result } = renderHook(() =>
      useCollaboration("page1", "user1", "Alice")
    );

    await vi.waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });

    const provider = mockProviderInstances[0];
    expect(provider.initialize).toHaveBeenCalled();
  });

  it("returns a Y.Doc from the provider", async () => {
    const { result } = renderHook(() =>
      useCollaboration("page1", "user1", "Alice")
    );

    await vi.waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });

    expect(result.current.ydoc).toBeDefined();
  });

  it("returns collaboration extension config", async () => {
    const { result } = renderHook(() =>
      useCollaboration("page1", "user1", "Alice")
    );

    await vi.waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });

    expect(result.current.collaborationExtension).toBeDefined();
  });

  it("returns collaboration cursor extension config", async () => {
    const { result } = renderHook(() =>
      useCollaboration("page1", "user1", "Alice")
    );

    await vi.waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });

    expect(result.current.collaborationCursorExtension).toBeDefined();
  });

  it("filters out current user from remoteUsers", async () => {
    mockSessionsData.mockReturnValue([
      { user_id: "user1", user_name: "Alice", color: "#4A90D9", cursor_position: "{}" },
      { user_id: "user2", user_name: "Bob", color: "#E8734A", cursor_position: '{"pos": 10}' },
    ]);

    const { result } = renderHook(() =>
      useCollaboration("page1", "user1", "Alice")
    );

    await vi.waitFor(() => {
      expect(result.current.remoteUsers).toHaveLength(1);
    });

    expect(result.current.remoteUsers[0].userId).toBe("user2");
  });

  it("applies remote updates when subscription data arrives", async () => {
    mockUpdatesData.mockReturnValue([
      { update_data: "AAAA" },
    ]);

    const { result } = renderHook(() =>
      useCollaboration("page1", "user1", "Alice")
    );

    await vi.waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });

    const provider = mockProviderInstances[0];
    expect(provider.applyRemoteUpdate).toHaveBeenCalledWith("AAAA");
  });

  it("destroys provider on unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useCollaboration("page1", "user1", "Alice")
    );

    await vi.waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });

    const provider = mockProviderInstances[0];
    unmount();
    expect(provider.destroy).toHaveBeenCalled();
  });

  it("toggles isActive based on session subscription changes", async () => {
    const { result, rerender } = renderHook(
      ({ pageId }: { pageId: string | undefined }) =>
        useCollaboration(pageId, "user1", "Alice"),
      { initialProps: { pageId: "page1" } },
    );

    await vi.waitFor(() => {
      expect(result.current.isActive).toBe(true);
    });

    // Rerender with undefined pageId
    rerender({ pageId: undefined });

    expect(result.current.isActive).toBe(false);
  });
});
