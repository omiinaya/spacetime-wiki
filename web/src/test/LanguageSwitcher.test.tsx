import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// ─── Mock i18n ─────────────────────────────────────────────────────────────────

const mockChangeLanguage = vi.fn();

vi.mock("../i18n/config", () => ({
  setLanguage: vi.fn((lang: string) => {
    localStorage.setItem("sw_language", lang);
    mockChangeLanguage(lang);
  }),
  getSupportedLanguages: vi.fn(() => ["en", "es", "fr", "de"]),
}));

// react-i18next mock
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "admin.language_label": "Language",
      };
      return map[key] || key;
    },
    i18n: {
      language: "en",
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

import { LanguageSwitcher } from "../components/LanguageSwitcher";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─── Compact mode ────────────────────────────────────────────────────────────

  it("renders compact mode with language select", () => {
    render(<LanguageSwitcher compact />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows all supported languages in compact mode", () => {
    render(<LanguageSwitcher compact />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Español")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByText("Deutsch")).toBeInTheDocument();
  });

  it("calls setLanguage on selection change in compact mode", () => {
    render(<LanguageSwitcher compact />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "es" } });
    expect(mockChangeLanguage).toHaveBeenCalledWith("es");
  });

  it("shows Languages icon in compact mode", () => {
    const { container } = render(<LanguageSwitcher compact />);
    // The Languages icon from lucide-react renders as an inline SVG
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  // ─── Full mode ───────────────────────────────────────────────────────────────

  it("renders full mode with label", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows all supported languages in full mode", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Español")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
    expect(screen.getByText("Deutsch")).toBeInTheDocument();
  });

  it("calls setLanguage on selection change in full mode", () => {
    render(<LanguageSwitcher />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "fr" } });
    expect(mockChangeLanguage).toHaveBeenCalledWith("fr");
  });

  it("selects the current language", () => {
    // Rerender with different i18n state by checking default 'en'
    render(<LanguageSwitcher />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("en");
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations in compact mode", async () => {
    const { container } = render(<LanguageSwitcher compact />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations in full mode", async () => {
    const { container } = render(<LanguageSwitcher />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
