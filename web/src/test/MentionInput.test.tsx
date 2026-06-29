import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockUsersList = vi.fn().mockResolvedValue([]);

vi.mock("../lib/api", () => ({
  api: {
    users: {
      list: (...args: unknown[]) => mockUsersList(...args),
    },
  },
}));

import { MentionInput } from "../components/MentionInput";

const sampleUsers = [
  { id: "u1", name: "Alice", email: "alice@wiki.local" },
  { id: "u2", name: "Bob", email: "bob@wiki.local" },
  { id: "u3", name: "Charlie", email: "charlie@wiki.local" },
];

function renderInput(props: Partial<Parameters<typeof MentionInput>[0]> = {}) {
  const onChange = props.onChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <MentionInput
        value={props.value ?? ""}
        onChange={onChange}
        placeholder={props.placeholder}
        onKeyDown={props.onKeyDown}
        className={props.className}
        minRows={props.minRows}
        disabled={props.disabled}
      />,
    ),
  };
}

// Wrapper that manages its own state for controlled input testing
function StatefulMentionInput() {
  const [value, setValue] = React.useState("");
  return <MentionInput value={value} onChange={setValue} />;
}

describe("MentionInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it("renders a textarea", () => {
    renderInput();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders with placeholder text", () => {
    renderInput({ placeholder: "Write a comment..." });
    expect(screen.getByPlaceholderText("Write a comment...")).toBeInTheDocument();
  });

  it("renders with initial value", () => {
    renderInput({ value: "Hello world" });
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Hello world");
  });

  it("loads users on mount", () => {
    renderInput();
    expect(mockUsersList).toHaveBeenCalledOnce();
  });

  it("respects disabled prop", () => {
    renderInput({ disabled: true });
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("respects minRows prop", () => {
    renderInput({ minRows: 3 });
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("rows", "3");
  });

  // ─── Text input via fireEvent ─────────────────────────────────────────────

  it("calls onChange when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInput({ onChange, value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    await user.type(ta, "Hello");
    expect(onChange).toHaveBeenCalled();
  });

  // ─── Mention popup via userEvent.type ────────────────────────────────────

  it("opens mention popup when @ is typed", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    renderInput({ value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows email subtitles in mention popup", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    renderInput({ value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");

    expect(screen.getByText("alice@wiki.local")).toBeInTheDocument();
  });

  it("filters users by name query after @", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    render(<StatefulMentionInput />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    // Type more to filter
    await user.type(ta, "Ali");
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("filters users by email query", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    render(<StatefulMentionInput />);
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");
    expect(screen.getByText("Alice")).toBeInTheDocument();

    // Type email chars to filter
    await user.type(ta, "bob");
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("inserts mention on item click", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInput({ onChange, value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");
    await user.click(screen.getByText("Alice"));
    expect(onChange).toHaveBeenCalledWith("@Alice ");
  });

  // ─── Keyboard navigation ──────────────────────────────────────────────────

  it("navigates down with ArrowDown", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    renderInput({ value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");

    const firstItem = screen.getByText("Alice").closest("button");
    expect(firstItem?.className).toContain("bg-primary/10");

    await user.keyboard("{ArrowDown}");
    const secondItem = screen.getByText("Bob").closest("button");
    expect(secondItem?.className).toContain("bg-primary/10");
  });

  it("navigates up with ArrowUp", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    renderInput({ value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowUp}");

    const firstItem = screen.getByText("Alice").closest("button");
    expect(firstItem?.className).toContain("bg-primary/10");
  });

  it("inserts mention on Enter", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderInput({ onChange, value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("@Alice ");
  });

  it("closes popup on Escape", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    renderInput({ value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");
    expect(screen.getByText("Alice")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  it("closes popup when space is typed after @", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    renderInput({ value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");
    expect(screen.getByText("Alice")).toBeInTheDocument();

    await user.type(ta, " ");
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("handles empty user list from API", async () => {
    mockUsersList.mockResolvedValue([]);
    const user = userEvent.setup();
    renderInput({ value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");

    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("handles API error gracefully", async () => {
    mockUsersList.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();
    renderInput({ value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    // Should not crash
    await user.type(ta, "@");
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations when empty", async () => {
    const { container } = renderInput();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations with mention popup open", async () => {
    mockUsersList.mockResolvedValue(sampleUsers);
    const user = userEvent.setup();
    const { container } = renderInput({ value: "" });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;

    await user.type(ta, "@");
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
