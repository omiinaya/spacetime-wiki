import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock Yjs ────────────────────────────────────────────────────────────────
const mockYDoc = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  getMap: vi.fn(),
  toJSON: vi.fn(),
}));

const mockApplyUpdate = vi.hoisted(() => vi.fn());

vi.mock("yjs", () => ({
  Doc: function () { return mockYDoc; },
  applyUpdate: mockApplyUpdate,
}));

// ─── Mock y-protocols/awareness ───────────────────────────────────────────────
const mockAwareness = vi.hoisted(() => ({
  setLocalStateField: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("y-protocols/awareness", () => ({
  Awareness: function () { return mockAwareness; },
}));

// ─── Mock api ─────────────────────────────────────────────────────────────────
const mockJoinSession = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetUpdates = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockBroadcastUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockUpdateCursor = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetSessions = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockLeaveSession = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("../lib/api", () => ({
  api: {
    collaboration: {
      joinSession: mockJoinSession,
      getUpdates: mockGetUpdates,
      broadcastUpdate: mockBroadcastUpdate,
      updateCursor: mockUpdateCursor,
      getSessions: mockGetSessions,
      leaveSession: mockLeaveSession,
    },
  },
  CollabUpdate: class {},
}));

// Import AFTER mocks
import { YjsStdbProvider } from "../lib/yjs-stdb-provider";

// ═══════════════════════════════════════════════════════════════════════════════
// YjsStdbProvider
// ═══════════════════════════════════════════════════════════════════════════════

describe("YjsStdbProvider", () => {
  let provider: YjsStdbProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new YjsStdbProvider("page1", "user1", "Alice");
  });

  describe("constructor", () => {
    it("creates a Y.Doc and Awareness instance", () => {
      expect(provider.doc).toBe(mockYDoc);
      expect(provider.awareness).toBe(mockAwareness);
    });
  });

  describe("initialize()", () => {
    it("sets local awareness state with user info", async () => {
      mockGetUpdates.mockResolvedValue([]);

      await provider.initialize();

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith("user", {
        name: "Alice",
        color: expect.any(String),
      });
    });

    it("calls joinSession on the API", async () => {
      mockGetUpdates.mockResolvedValue([]);

      await provider.initialize();

      expect(mockJoinSession).toHaveBeenCalledWith("page1", "user1", "Alice", expect.any(String));
    });

    it("fetches and applies existing Yjs updates", async () => {
      const fakeUpdate = btoa(String.fromCharCode(1, 2, 3, 4));
      mockGetUpdates.mockResolvedValue([{ update_data: fakeUpdate }]);

      await provider.initialize();

      expect(mockGetUpdates).toHaveBeenCalledWith("page1");
      expect(mockApplyUpdate).toHaveBeenCalled();
    });

    it("registers an update handler on the Y.Doc", async () => {
      mockGetUpdates.mockResolvedValue([]);

      await provider.initialize();

      expect(mockYDoc.on).toHaveBeenCalledWith("update", expect.any(Function));
    });

    it("handles errors fetching existing updates gracefully", async () => {
      mockGetUpdates.mockRejectedValue(new Error("DB error"));

      await expect(provider.initialize()).resolves.not.toThrow();
    });
  });

  describe("applyRemoteUpdate()", () => {
    it("decodes base64 update and applies it to Y.Doc", () => {
      const updateData = btoa("test data");
      provider.applyRemoteUpdate(updateData);

      expect(mockApplyUpdate).toHaveBeenCalledWith(
        provider.doc,
        expect.any(Uint8Array),
        "remote",
      );
    });

    it("does nothing when destroyed", () => {
      provider.destroy();
      provider.applyRemoteUpdate("AAAA");

      expect(mockApplyUpdate).not.toHaveBeenCalled();
    });

    it("handles invalid base64 gracefully", () => {
      expect(() => provider.applyRemoteUpdate("!!!invalid!!!")).not.toThrow();
    });
  });

  describe("updateCursor()", () => {
    it("calls the API with cursor data", () => {
      provider.updateCursor('{"pos": 42}');

      expect(mockUpdateCursor).toHaveBeenCalledWith("page1", "user1", '{"pos": 42}');
    });

    it("does nothing when destroyed", () => {
      provider.destroy();
      provider.updateCursor('{"pos": 42}');

      expect(mockUpdateCursor).not.toHaveBeenCalled();
    });
  });

  describe("getOtherSessions()", () => {
    it("excludes the current user from results", async () => {
      mockGetSessions.mockResolvedValue([
        { user_id: "user1", user_name: "Alice", color: "#4A90D9", cursor_position: "{}" },
        { user_id: "user2", user_name: "Bob", color: "#E8734A", cursor_position: '{"pos": 10}' },
      ]);

      const others = await provider.getOtherSessions();

      expect(others).toHaveLength(1);
      expect(others[0]).toMatchObject({ userId: "user2", userName: "Bob" });
    });

    it("returns empty array when API fails", async () => {
      mockGetSessions.mockRejectedValue(new Error("DB error"));

      const others = await provider.getOtherSessions();
      expect(others).toEqual([]);
    });

    it("returns empty when no other users have sessions", async () => {
      mockGetSessions.mockResolvedValue([
        { user_id: "user1", user_name: "Alice", color: "#4A90D9", cursor_position: "{}" },
      ]);

      const others = await provider.getOtherSessions();
      expect(others).toHaveLength(0);
    });
  });

  describe("destroy()", () => {
    it("removes the update handler from Y.Doc", async () => {
      mockGetUpdates.mockResolvedValue([]);
      await provider.initialize();
      // initialize() registers updateHandler, then destroy() removes it
      provider.destroy();
      expect(mockYDoc.off).toHaveBeenCalledWith("update", expect.any(Function));
    });

    it("destroys awareness", () => {
      provider.destroy();
      expect(mockAwareness.destroy).toHaveBeenCalled();
    });

    it("calls leaveSession on the API", () => {
      provider.destroy();
      expect(mockLeaveSession).toHaveBeenCalledWith("page1", "user1");
    });

    it("makes further method calls no-ops", () => {
      provider.destroy();
      provider.applyRemoteUpdate("AAAA");
      provider.updateCursor('{"x":1}');

      expect(mockApplyUpdate).not.toHaveBeenCalled();
      expect(mockUpdateCursor).not.toHaveBeenCalled();
    });
  });
});
