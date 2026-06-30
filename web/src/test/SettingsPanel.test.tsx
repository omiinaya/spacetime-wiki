import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// ─── Mock sub-components ──────────────────────────────────────────────────────

vi.mock("../components/LanguageSwitcher", () => ({
  LanguageSwitcher: () => (
    <div data-testid="language-switcher">LanguageSwitcher Mock</div>
  ),
}));

vi.mock("../components/admin/TrashSettings", () => ({
  TrashSettings: () => (
    <div data-testid="trash-settings">TrashSettings Mock</div>
  ),
}));

import { SettingsPanel } from "../components/admin/SettingsPanel";

describe("SettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it("renders the Language section header", () => {
    render(<SettingsPanel />);
    expect(screen.getByText("Language")).toBeInTheDocument();
  });

  it("renders the Trash Retention section header", () => {
    render(<SettingsPanel />);
    expect(screen.getByText("Trash Retention")).toBeInTheDocument();
  });

  it("renders the LanguageSwitcher sub-component", () => {
    render(<SettingsPanel />);
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("renders the TrashSettings sub-component", () => {
    render(<SettingsPanel />);
    expect(screen.getByTestId("trash-settings")).toBeInTheDocument();
  });

  // ─── Structure ─────────────────────────────────────────────────────────────

  it("has Language before Trash Retention in the DOM", () => {
    const { container } = render(<SettingsPanel />);
    const languageHeader = screen.getByText("Language");
    const trashHeader = screen.getByText("Trash Retention");
    expect(languageHeader.compareDocumentPosition(trashHeader)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations", async () => {
    const { container } = render(<SettingsPanel />);
    await waitFor(() => {
      expect(screen.getByText("Language")).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
