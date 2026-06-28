import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockListTemplates = vi.hoisted(() => vi.fn());
const mockCreateFromTemplate = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  api: {
    pages: {
      listTemplates: mockListTemplates,
      createFromTemplate: mockCreateFromTemplate,
    },
  },
  Page: class {},
  Collection: class {},
}));

import { TemplatePicker } from "../components/TemplatePicker";
import type { Page, Collection } from "../lib/api";

const sampleCollections: Collection[] = [
  { id: "c1", name: "Engineering", icon: "⚙️", slug: "eng", color: "", description: "", parent_id: "", sort_order: 0, created_by: "", created_at: 0, updated_at: 0 },
  { id: "c2", name: "Design", icon: "🎨", slug: "design", color: "", description: "", parent_id: "", sort_order: 1, created_by: "", created_at: 0, updated_at: 0 },
];

const sampleTemplates: Page[] = [
  { id: "t1", title: "Bug Report", collection_id: "c1", icon: "🐛", color: "", content: "", is_template: true, slug: "bug-report", parent_id: "", is_published: false, is_archived: false, version: 1, description: "", tags: "", sort_order: 0, created_by: "u1", created_at: 100, updated_at: 100 },
  { id: "t2", title: "Feature Spec", collection_id: "c1", icon: "✨", color: "", content: "", is_template: true, slug: "feature-spec", parent_id: "", is_published: false, is_archived: false, version: 1, description: "", tags: "", sort_order: 1, created_by: "u1", created_at: 200, updated_at: 200 },
];

function renderPicker(
  open = true,
  collections: Collection[] = sampleCollections,
  userId: string | null = "u1",
  navigate?: ReturnType<typeof vi.fn>,
  onClose?: ReturnType<typeof vi.fn>,
) {
  const navigateFn = navigate ?? vi.fn();
  const onCloseFn = onClose ?? vi.fn();
  return {
    navigateFn,
    onCloseFn,
    ...render(<TemplatePicker open={open} onClose={onCloseFn} collections={collections} userId={userId} navigate={navigateFn} />),
  };
}

describe("TemplatePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTemplates.mockResolvedValue(sampleTemplates);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it("renders nothing when closed", () => {
    const { container } = renderPicker(false);
    expect(container.innerHTML).toBe("");
  });

  it("renders the modal when open", () => {
    renderPicker(true);
    expect(screen.getByText("New page from template")).toBeInTheDocument();
  });

  it("renders inside a portal", () => {
    const { container } = renderPicker(true);
    expect(container.innerHTML).toBe("");
    expect(screen.getByText("New page from template")).toBeInTheDocument();
  });

  it("renders blank page option", () => {
    renderPicker(true);
    expect(screen.getByText("Blank page")).toBeInTheDocument();
    expect(screen.getByText("Start with an empty document")).toBeInTheDocument();
  });

  it("renders collection selector with correct options", async () => {
    renderPicker(true);
    await waitFor(() => {
      expect(screen.getByText(/⚙️ Engineering/)).toBeInTheDocument();
      expect(screen.getByText(/🎨 Design/)).toBeInTheDocument();
    });
  });

  it("shows Uncategorized as fallback option", () => {
    renderPicker(true);
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    mockListTemplates.mockImplementation(() => new Promise(() => {})); // never resolves
    renderPicker(true);
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  // ─── Template list ─────────────────────────────────────────────────────────

  it("fetches templates on mount when open", async () => {
    renderPicker(true);
    await waitFor(() => {
      expect(mockListTemplates).toHaveBeenCalledOnce();
    });
  });

  it("does not fetch templates when closed", () => {
    renderPicker(false);
    expect(mockListTemplates).not.toHaveBeenCalled();
  });

  it("renders template items with titles", async () => {
    renderPicker(true);
    await waitFor(() => {
      expect(screen.getByText("Bug Report")).toBeInTheDocument();
      expect(screen.getByText("Feature Spec")).toBeInTheDocument();
    });
  });

  it("shows template count in footer", async () => {
    renderPicker(true);
    await waitFor(() => {
      expect(screen.getByText("2 templates available")).toBeInTheDocument();
    });
  });

  it("shows 'No templates yet' empty state when no templates", async () => {
    mockListTemplates.mockResolvedValue([]);
    renderPicker(true);
    await waitFor(() => {
      expect(screen.getByText(/No templates yet/)).toBeInTheDocument();
    });
  });

  it("shows grouped templates under collection headers", async () => {
    renderPicker(true);
    await waitFor(() => {
      // Templates in "c1" (Engineering) should render under a group header
      expect(screen.getByText(/⚙️ Engineering/)).toBeInTheDocument();
    });
  });

  it("handles API fetch errors gracefully", async () => {
    mockListTemplates.mockRejectedValue(new Error("Network error"));
    renderPicker(true);
    // Should not throw — the component catches the error
    await waitFor(() => {
      expect(screen.getByText(/No templates yet/)).toBeInTheDocument();
    });
  });

  // ─── Template selection & creation ─────────────────────────────────────────

  it("calls createFromTemplate and navigates when template is clicked", async () => {
    mockCreateFromTemplate.mockResolvedValue("new-page-id");
    const navigate = vi.fn();
    const onClose = vi.fn();
    renderPicker(true, sampleCollections, "u1", navigate, onClose);
    await waitFor(() => {
      expect(screen.getByText("Bug Report")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Bug Report"));
    await waitFor(() => {
      expect(mockCreateFromTemplate).toHaveBeenCalledWith(
        "t1",
        "Bug Report (copy)",
        "c1",
        "u1",
      );
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/page/new-page-id/edit");
  });

  it("does not call createFromTemplate when userId is null", async () => {
    renderPicker(true, sampleCollections, null);
    await waitFor(() => {
      expect(screen.getByText("Bug Report")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Bug Report"));
    // With no userId, the handler returns early
    await waitFor(() => {
      expect(mockCreateFromTemplate).not.toHaveBeenCalled();
    });
  });

  it("handles createFromTemplate error gracefully", async () => {
    mockCreateFromTemplate.mockRejectedValue(new Error("API error"));
    renderPicker(true);
    await waitFor(() => {
      expect(screen.getByText("Bug Report")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Bug Report"));
    // Should not throw — error is caught in the component
    await waitFor(() => {
      expect(mockCreateFromTemplate).toHaveBeenCalled();
    });
  });

  // ─── Blank page ────────────────────────────────────────────────────────────

  it("navigates to /new when blank page is clicked", () => {
    const navigate = vi.fn();
    const onClose = vi.fn();
    renderPicker(true, sampleCollections, "u1", navigate, onClose);
    fireEvent.click(screen.getByText("Blank page"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/new");
  });

  // ─── Collection selector ───────────────────────────────────────────────────

  it("selects first collection by default", async () => {
    renderPicker(true);
    const select = document.querySelector("select") as HTMLSelectElement;
    expect(select?.value).toBe("c1");
  });

  it("allows changing selected collection", () => {
    renderPicker(true);
    const select = document.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "c2" } });
    expect(select.value).toBe("c2");
  });

  it("uses selected collection when creating from template", async () => {
    mockCreateFromTemplate.mockResolvedValue("new-id");
    renderPicker(true, sampleCollections, "u1");
    await waitFor(() => {
      expect(screen.getByText("Bug Report")).toBeInTheDocument();
    });
    // Change to Design collection
    const select = document.querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "c2" } });
    fireEvent.click(screen.getByText("Bug Report"));
    await waitFor(() => {
      expect(mockCreateFromTemplate).toHaveBeenCalledWith(
        "t1",
        "Bug Report (copy)",
        "c2",
        "u1",
      );
    });
  });

  // ─── Modal interaction ─────────────────────────────────────────────────────

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    renderPicker(true, sampleCollections, "u1", vi.fn(), onClose);
    expect(onClose).not.toHaveBeenCalled();
    // The X button renders inside the header — click all header buttons and one should trigger onClose
    const header = document.querySelector(".h-12");
    expect(header).toBeInTheDocument();
    const headerButtons = header?.querySelectorAll("button") || [];
    // Click the X button (the first/only button in header)
    for (const btn of headerButtons) {
      fireEvent.click(btn);
    }
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    renderPicker(true, sampleCollections, "u1", vi.fn(), onClose);
    // Click the overlay (the outermost fixed div with bg-black/60)
    const overlay = document.querySelector(".fixed.inset-0") as HTMLElement;
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("prevents closing when clicking inside the modal", () => {
    const onClose = vi.fn();
    renderPicker(true, sampleCollections, "u1", vi.fn(), onClose);
    const modal = document.querySelector(".max-w-lg") as HTMLElement;
    expect(modal).toBeInTheDocument();
    fireEvent.click(modal);
    expect(onClose).not.toHaveBeenCalled();
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations when open with templates", async () => {
    const { container } = renderPicker(true);
    await waitFor(() => {
      expect(screen.getByText("Bug Report")).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations when open with no templates", async () => {
    mockListTemplates.mockResolvedValue([]);
    const { container } = renderPicker(true);
    await waitFor(() => {
      expect(screen.getByText(/No templates yet/)).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations when closed", async () => {
    const { container } = renderPicker(false);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
