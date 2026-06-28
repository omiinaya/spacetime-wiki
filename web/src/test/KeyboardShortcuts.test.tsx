import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { KeyboardShortcuts } from "../components/KeyboardShortcuts";

function renderShortcuts(open = true, onClose?: ReturnType<typeof vi.fn>) {
  const onCloseFn = onClose ?? vi.fn();
  return {
    onCloseFn,
    ...render(<KeyboardShortcuts open={open} onClose={onCloseFn} />),
  };
}

describe("KeyboardShortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it("renders nothing when closed", () => {
    const { container } = renderShortcuts(false);
    expect(container.innerHTML).toBe("");
  });

  it("renders the modal when open", () => {
    renderShortcuts(true);
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("renders inside a portal (not in the container directly)", () => {
    const { container } = renderShortcuts(true);
    // The portal renders into document.body, so the container should be empty
    expect(container.innerHTML).toBe("");
    // But the content should be in the DOM
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  // ─── Shortcut groups ────────────────────────────────────────────────────────

  it("renders all 5 shortcut group headers", () => {
    renderShortcuts(true);
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Slash Commands")).toBeInTheDocument();
    expect(screen.getByText("Emoji Picker")).toBeInTheDocument();
    expect(screen.getByText("Mentions")).toBeInTheDocument();
  });

  it("renders Global shortcuts with correct labels", () => {
    renderShortcuts(true);
    expect(screen.getByText("Command palette")).toBeInTheDocument();
    expect(screen.getByText("Keyboard shortcuts (this)")).toBeInTheDocument();
    expect(screen.getByText("Save page")).toBeInTheDocument();
  });

  it("renders Navigation shortcuts with correct labels", () => {
    renderShortcuts(true);
    expect(screen.getByText("Bold")).toBeInTheDocument();
    expect(screen.getByText("Italic")).toBeInTheDocument();
    expect(screen.getByText("Underline")).toBeInTheDocument();
    expect(screen.getByText("Strikethrough")).toBeInTheDocument();
    expect(screen.getByText("Heading 1")).toBeInTheDocument();
    expect(screen.getByText("Heading 2")).toBeInTheDocument();
    expect(screen.getByText("Heading 3")).toBeInTheDocument();
    expect(screen.getByText("Bullet list")).toBeInTheDocument();
    expect(screen.getByText("Ordered list")).toBeInTheDocument();
    expect(screen.getByText("Blockquote")).toBeInTheDocument();
    expect(screen.getByText("Code block")).toBeInTheDocument();
  });

  it("renders Slash Commands shortcuts", () => {
    renderShortcuts(true);
    expect(screen.getByText("Open slash command menu")).toBeInTheDocument();
    expect(screen.getByText("Navigate commands")).toBeInTheDocument();
    expect(screen.getByText("Select command")).toBeInTheDocument();
    expect(screen.getByText("Close menu")).toBeInTheDocument();
  });

  it("renders Emoji Picker shortcuts", () => {
    renderShortcuts(true);
    expect(screen.getByText(/Type `:` followed by name/)).toBeInTheDocument();
    expect(screen.getByText("Navigate emoji")).toBeInTheDocument();
    expect(screen.getByText("Insert selected emoji")).toBeInTheDocument();
    expect(screen.getByText("Close picker")).toBeInTheDocument();
  });

  it("renders Mentions shortcuts", () => {
    renderShortcuts(true);
    expect(screen.getByText("Open mention menu")).toBeInTheDocument();
    expect(screen.getByText("Navigate suggestions")).toBeInTheDocument();
    expect(screen.getByText("Insert mention")).toBeInTheDocument();
  });

  // ─── Key bindings display ──────────────────────────────────────────────────

  it("displays keyboard shortcut key labels as <kbd> elements", () => {
    renderShortcuts(true);
    const kbdElements = document.querySelectorAll("kbd");
    expect(kbdElements.length).toBeGreaterThan(20);
    // Check for known key labels
    const kbdTexts = Array.from(kbdElements).map((el) => el.textContent);
    expect(kbdTexts).toEqual(expect.arrayContaining(["⌘K / Ctrl+K"]));
    expect(kbdTexts).toEqual(expect.arrayContaining(["?"]));
    expect(kbdTexts).toEqual(expect.arrayContaining(["/"]));
  });

  // ─── Close button ──────────────────────────────────────────────────────────

  it("renders a close button", () => {
    renderShortcuts(true);
    const closeBtn = document.querySelector("button");
    expect(closeBtn).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    renderShortcuts(true, onClose);
    const closeBtn = document.querySelector("button");
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when clicking the overlay background", () => {
    const onClose = vi.fn();
    renderShortcuts(true, onClose);
    // The overlay is the outermost div with fixed inset-0
    const overlay = document.querySelector(".fixed.inset-0");
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT call onClose when clicking inside the modal content", () => {
    const onClose = vi.fn();
    renderShortcuts(true, onClose);
    // Click on a group header inside the modal
    fireEvent.click(screen.getByText("Global"));
    expect(onClose).not.toHaveBeenCalled();
  });

  // ─── Footer ─────────────────────────────────────────────────────────────────

  it("shows shortcut group count in the footer", () => {
    renderShortcuts(true);
    expect(screen.getByText("5 shortcut groups")).toBeInTheDocument();
  });

  it("shows toggle hint in the footer", () => {
    renderShortcuts(true);
    expect(screen.getByText(/Press/)).toBeInTheDocument();
    // The kbd inside the footer
    const footerKbds = document.querySelectorAll(".shrink-0 kbd");
    expect(footerKbds.length).toBeGreaterThanOrEqual(1);
    expect(footerKbds[0].textContent).toBe("?");
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations when open", async () => {
    const { container } = renderShortcuts(true);
    // Portal content is not in container by default, so we need to
    // query the full document context for axe
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations when closed", async () => {
    const { container } = renderShortcuts(false);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
