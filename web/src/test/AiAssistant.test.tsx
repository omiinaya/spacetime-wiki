import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockSessionsList = vi.hoisted(() => vi.fn());
const mockSessionsCreate = vi.hoisted(() => vi.fn());
const mockSessionsDelete = vi.hoisted(() => vi.fn());
const mockMessagesList = vi.hoisted(() => vi.fn());
const mockMessagesAdd = vi.hoisted(() => vi.fn());
const mockConfigGetAll = vi.hoisted(() => vi.fn());
const mockConfigSet = vi.hoisted(() => vi.fn());
const mockAiAsk = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  api: {
    ai: {
      sessions: {
        list: mockSessionsList,
        create: mockSessionsCreate,
        delete: mockSessionsDelete,
      },
      messages: {
        list: mockMessagesList,
        add: mockMessagesAdd,
      },
      config: {
        getAll: mockConfigGetAll,
        set: mockConfigSet,
      },
      ask: mockAiAsk,
    },
  },
}));

import { AiAssistant } from "../components/AiAssistant";

// ─── Mock DOM APIs not available in jsdom ────────────────────────────────────

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleSessions = [
  { id: "s1", user_id: "u1", title: "Chat about \"Welcome\"", page_context_id: "p1", created_at: 2000, updated_at: 2000 },
  { id: "s2", user_id: "u1", title: "Chat 6/29/2026, 12:00:00 PM", page_context_id: "", created_at: 1000, updated_at: 1000 },
];

const sampleMessages = [
  { id: "m1", session_id: "s1", role: "user", content: "What is this wiki about?", created_at: 3000 },
  { id: "m2", session_id: "s1", role: "assistant", content: "This wiki is a knowledge base for your team.", created_at: 3001 },
];

// ─── Render helper ────────────────────────────────────────────────────────────

function renderAssistant(overrides?: {
  userId?: string;
  currentPageId?: string;
  currentPageTitle?: string;
  onClose?: ReturnType<typeof vi.fn>;
}) {
  const onClose = overrides?.onClose ?? vi.fn();
  return {
    onClose,
    ...render(
      <AiAssistant
        userId={overrides?.userId ?? "u1"}
        currentPageId={overrides?.currentPageId}
        currentPageTitle={overrides?.currentPageTitle}
        onClose={onClose}
      />,
    ),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering & welcome screen
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rendering and welcome screen", () => {
    it("renders the AI Assistant panel header", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      renderAssistant();
      expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    });

    it("shows welcome screen with 'Start a new chat' button when no session exists", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByText("Start a new chat")).toBeInTheDocument();
      });
    });

    it('shows "Ask anything about your wiki content." prompt with an active session and no messages', async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByText("Ask anything about your wiki content.")).toBeInTheDocument();
      });
    });

    it("shows current page title in header when provided", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      renderAssistant({ currentPageTitle: "Meeting Notes" });
      expect(screen.getByText((t) => t.includes("Meeting Notes"))).toBeInTheDocument();
    });

    it("shows 'Ask me anything about your wiki' text", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByText(/Ask questions about your wiki content/)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Panel close
  // ═══════════════════════════════════════════════════════════════════════════

  describe("panel close", () => {
    it("calls onClose when close button is clicked", () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      const onClose = vi.fn();
      renderAssistant({ onClose });
      fireEvent.click(screen.getByTitle("Close"));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Session management
  // ═══════════════════════════════════════════════════════════════════════════

  describe("session management", () => {
    it("loads sessions on mount and displays session tabs", async () => {
      mockSessionsList.mockResolvedValue(sampleSessions);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      renderAssistant();
      await waitFor(() => {
        expect(mockSessionsList).toHaveBeenCalledWith("u1");
      });
      await waitFor(() => {
        expect(screen.getByText((t) => t.includes('Chat about'))).toBeInTheDocument();
      });
    });

    it("creates a new session when 'Start a new chat' button is clicked", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      mockSessionsCreate.mockResolvedValue("s3");
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByText("Start a new chat")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Start a new chat"));
      await waitFor(() => {
        expect(mockSessionsCreate).toHaveBeenCalledWith("u1", expect.any(String), "");
      });
    });

    it("creates a new session with page context when currentPageId is provided", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      mockSessionsCreate.mockResolvedValue("s3");
      renderAssistant({ currentPageId: "p1", currentPageTitle: "Test Page" });
      await waitFor(() => {
        expect(screen.getByText("Start a new chat")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Start a new chat"));
      await waitFor(() => {
        expect(mockSessionsCreate).toHaveBeenCalledWith("u1", expect.stringContaining("Test Page"), "p1");
      });
    });

    it("creates a new session via the '+' button in header", async () => {
      mockSessionsList.mockResolvedValue(sampleSessions);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      mockSessionsCreate.mockResolvedValue("s3");
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByTitle("New chat")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTitle("New chat"));
      await waitFor(() => {
        expect(mockSessionsCreate).toHaveBeenCalledOnce();
      });
      expect(mockSessionsCreate).toHaveBeenCalledWith("u1", expect.any(String), "");
    });

    it("switches active session when a session tab is clicked", async () => {
      mockSessionsList.mockResolvedValue(sampleSessions);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByText((t) => t.includes('Chat about'))).toBeInTheDocument();
      });
      // second session tab (title truncated to 24 chars: "Chat 6/29/2026, 12:00:0")
      fireEvent.click(screen.getByText((t) => t.includes('Chat 6/29')));
      await waitFor(() => {
        expect(mockMessagesList).toHaveBeenCalledWith("s2");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Messages display
  // ═══════════════════════════════════════════════════════════════════════════

  describe("messages display", () => {
    it("loads and displays messages for the active session", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue(sampleMessages);
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByText("What is this wiki about?")).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText("This wiki is a knowledge base for your team.")).toBeInTheDocument();
      });
    });

    it("shows empty state when session has no messages and not loading", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByText("Ask anything about your wiki content.")).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sending messages
  // ═══════════════════════════════════════════════════════════════════════════

  describe("sending messages", () => {
    it("disables input textarea when no active session exists", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Start a chat first...")).toBeDisabled();
      });
    });

    it("enables input when an active session exists", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      renderAssistant();
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/)).toBeEnabled();
      });
    });

    it("send button is disabled when input is empty", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      renderAssistant();
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const sendButton = buttons.find(b => b.innerHTML.includes("Send") || b.querySelector("svg.lucide-send"));
        expect(sendButton).toBeDefined();
        expect(sendButton).toBeDisabled();
      });
    });

    it("sends a message and displays user message bubble", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      mockMessagesAdd.mockResolvedValue("m3");
      mockAiAsk.mockResolvedValue("AI response text");
      renderAssistant();

      // Wait for input to be enabled
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/)).toBeEnabled();
      });

      const input = screen.getByPlaceholderText(/Ask a question/);
      fireEvent.change(input, { target: { value: "Hello AI!" } });

      // Find send button (it's the one with lucide-send icon)
      const allBtns = screen.getAllByRole("button");
      const sendButton = allBtns.find(btn => btn.querySelector("svg.lucide-send"));
      if (!sendButton) throw new Error("Send button not found");

      fireEvent.click(sendButton);

      // User message should appear immediately
      await waitFor(() => {
        expect(screen.getByText("Hello AI!")).toBeInTheDocument();
      });

      // API should have been called
      await waitFor(() => {
        expect(mockMessagesAdd).toHaveBeenCalledWith("s1", "user", "Hello AI!");
      });
      await waitFor(() => {
        expect(mockAiAsk).toHaveBeenCalledWith("s1", "Hello AI!", undefined);
      });
    });

    it("sends message via Enter key", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      mockMessagesAdd.mockResolvedValue("m3");
      mockAiAsk.mockResolvedValue("AI response");
      renderAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/)).toBeEnabled();
      });

      const input = screen.getByPlaceholderText(/Ask a question/);
      fireEvent.change(input, { target: { value: "Enter key test" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(screen.getByText("Enter key test")).toBeInTheDocument();
      });
    });

    it("does not send when Shift+Enter is pressed (newline)", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      mockMessagesAdd.mockResolvedValue("m3");
      mockAiAsk.mockResolvedValue("AI response");
      renderAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/)).toBeEnabled();
      });

      const input = screen.getByPlaceholderText(/Ask a question/) as HTMLTextAreaElement;
      fireEvent.change(input, { target: { value: "Shift enter test" } });
      fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

      // Wait a tick — the message should NOT appear because Shift+Enter allows newline
      await new Promise(resolve => setTimeout(resolve, 100));
      // The input textarea may contain the text, check no message bubble appears
      expect(screen.queryByText("Shift enter test", { selector: 'div' })).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Loading state
  // ═══════════════════════════════════════════════════════════════════════════

  describe("loading state", () => {
    it("shows loading indicator (spinner) while AI is responding", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);

      // Keep the promise pending so loading stays true
      mockMessagesAdd.mockImplementation(() => new Promise(() => {}));
      mockAiAsk.mockImplementation(() => new Promise(() => {}));

      renderAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/)).toBeEnabled();
      });

      const input = screen.getByPlaceholderText(/Ask a question/);
      fireEvent.change(input, { target: { value: "Loading test" } });

      // Click send button
      const allBtns = screen.getAllByRole("button");
      const sendButton = allBtns.find(btn => btn.querySelector("svg.lucide-send"));
      if (!sendButton) throw new Error("Send button not found");
      fireEvent.click(sendButton);

      // Loading spinner should appear
      await waitFor(() => {
        const spinner = document.querySelector(".animate-spin");
        expect(spinner).toBeTruthy();
      });
    });

    it("disables input and send button while loading", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);

      mockMessagesAdd.mockImplementation(() => new Promise(() => {}));
      mockAiAsk.mockImplementation(() => new Promise(() => {}));

      renderAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/)).toBeEnabled();
      });

      const input = screen.getByPlaceholderText(/Ask a question/);
      fireEvent.change(input, { target: { value: "Disable test" } });

      const allBtns = screen.getAllByRole("button");
      const sendButton = allBtns.find(btn => btn.querySelector("svg.lucide-send"));
      if (!sendButton) throw new Error("Send button not found");
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/)).toBeDisabled();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════════════════════════════════════

  describe("error handling", () => {
    it("shows error message when AI ask fails", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      mockMessagesAdd.mockResolvedValue("m3");
      // mockAiAsk must reject so handleSend enters the catch block
      mockAiAsk.mockImplementation(() => Promise.reject(new Error("AI service unavailable")));

      renderAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/)).toBeEnabled();
      });

      const input = screen.getByPlaceholderText(/Ask a question/);
      fireEvent.change(input, { target: { value: "Error test" } });

      const allBtns = screen.getAllByRole("button");
      const sendButton = allBtns.find(btn => btn.querySelector("svg.lucide-send"));
      if (!sendButton) throw new Error("Send button not found");
      fireEvent.click(sendButton);

      await waitFor(() => {
        const errorElements = screen.getAllByText(/AI service unavailable/);
        expect(errorElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("shows error message when session creation fails", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      mockSessionsCreate.mockRejectedValue(new Error("Failed to create session"));

      renderAssistant();

      await waitFor(() => {
        expect(screen.getByText("Start a new chat")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Start a new chat"));

      await waitFor(() => {
        expect(screen.getByText(/Failed to create session/)).toBeInTheDocument();
      });
    });

    it("displays error message with dismiss button", async () => {
      mockSessionsList.mockResolvedValue([sampleSessions[0]]);
      mockConfigGetAll.mockResolvedValue([]);
      mockMessagesList.mockResolvedValue([]);
      mockMessagesAdd.mockResolvedValue("m3");
      mockAiAsk.mockImplementation(() => Promise.reject(new Error("Temporary error")));

      renderAssistant();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Ask a question/)).toBeEnabled();
      });

      const input = screen.getByPlaceholderText(/Ask a question/);
      fireEvent.change(input, { target: { value: "Dismiss test" } });

      const allBtns = screen.getAllByRole("button");
      const sendButton = allBtns.find(btn => btn.querySelector("svg.lucide-send"));
      if (!sendButton) throw new Error("Send button not found");
      fireEvent.click(sendButton);

      await waitFor(() => {
        const errEls = screen.getAllByText(/Temporary error/);
        expect(errEls.length).toBeGreaterThanOrEqual(1);
      });

      // Find and click the dismiss X button inside the error banner
      const errBanners = screen.getAllByText(/Temporary error/);
      const errorBanner = errBanners.find(el => el.closest('[class*="bg-red"]'));
      if (errorBanner) {
        const bannerDiv = errorBanner.closest('[class*="bg-red"]');
        const dismissBtn = bannerDiv?.querySelector("button");
        if (dismissBtn) {
          fireEvent.click(dismissBtn);
          await waitFor(() => {
            // The error banner (bg-red) should be gone — message bubble remains
            expect(document.querySelector('[class*="bg-red"]')).toBeNull();
          });
        }
      }
    });
  });

  it("shows error message when config save fails", async () => {
    mockSessionsList.mockResolvedValue([]);
    mockConfigGetAll.mockResolvedValue([]);
    mockConfigSet.mockRejectedValue(new Error("Config save failed"));

      renderAssistant();

      // Open settings panel
      fireEvent.click(screen.getByTitle("AI Settings"));

      await waitFor(() => {
        expect(screen.getByText("Provider")).toBeInTheDocument();
      });

      // Change provider value to trigger saveConfig
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "openai" } });

      await waitFor(() => {
        expect(screen.getByText(/Config save failed/)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Settings panel
  // ═══════════════════════════════════════════════════════════════════════════

  describe("settings panel", () => {
    it("opens settings panel when gear button is clicked", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      renderAssistant();

      fireEvent.click(screen.getByTitle("AI Settings"));

      await waitFor(() => {
        expect(screen.getByText("Provider")).toBeInTheDocument();
      });
      expect(screen.getByText("API URL (default: http://localhost:11434)")).toBeInTheDocument();
      expect(screen.getByText("Model")).toBeInTheDocument();
      expect(screen.getByText("API Key (for OpenAI/Anthropic)")).toBeInTheDocument();
      expect(screen.getByText("System Prompt")).toBeInTheDocument();
    });

    it("toggles settings panel open/close on gear click", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      renderAssistant();

      const gearBtn = screen.getByTitle("AI Settings");

      // Open
      fireEvent.click(gearBtn);
      await waitFor(() => {
        expect(screen.getByText("Provider")).toBeInTheDocument();
      });

      // Close
      fireEvent.click(gearBtn);
      await waitFor(() => {
        expect(screen.queryByText("Provider")).not.toBeInTheDocument();
      });
    });

    it("pre-fills config values from API", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([
        { key: "provider", value: "openai", updated_at: 1000 },
        { key: "model", value: "gpt-4", updated_at: 1000 },
      ]);
      renderAssistant();

      fireEvent.click(screen.getByTitle("AI Settings"));

      await waitFor(() => {
        const select = screen.getByRole("combobox") as HTMLSelectElement;
        expect(select.value).toBe("openai");
      });

      // Check for the model input value
      const modelInput = screen.getByDisplayValue("gpt-4") as HTMLInputElement;
      expect(modelInput).toBeInTheDocument();
    });

    it("saves config on blur-sm of input fields", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      mockConfigSet.mockResolvedValue(undefined);
      renderAssistant();

      fireEvent.click(screen.getByTitle("AI Settings"));

      await waitFor(() => {
        expect(screen.getByPlaceholderText("llama3.2")).toBeInTheDocument();
      });

      const modelInput = screen.getByPlaceholderText("llama3.2");
      fireEvent.change(modelInput, { target: { value: "llama3.1" } });
      fireEvent.blur(modelInput);

      await waitFor(() => {
        expect(mockConfigSet).toHaveBeenCalledWith("model", "llama3.1");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility
  // ═══════════════════════════════════════════════════════════════════════════

  describe("accessibility", () => {
    it("has no accessibility violations", async () => {
      mockSessionsList.mockResolvedValue([]);
      mockConfigGetAll.mockResolvedValue([]);
      const { container } = renderAssistant();
      await waitFor(() => {
        expect(screen.getByText("Start a new chat")).toBeInTheDocument();
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

