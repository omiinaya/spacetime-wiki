import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockPagesList = vi.hoisted(() => vi.fn());
const mockCollectionsList = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  api: {
    pages: { list: mockPagesList },
    collections: { list: mockCollectionsList },
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

import GraphView from "../components/GraphView";

// ─── Sample data ───────────────────────────────────────────────────────────────

const samplePages = [
  {
    id: "page1", title: "Welcome Page", slug: "welcome", content: "",
    text_content: "Hello! Check out /page/page2 for more.",
    collection_id: "col1", parent_page_id: "", status: "active", icon: "📄",
    color: "", full_width: false, is_pinned: false, is_template: false,
    template_id: "", sort_order: 0, created_by: "u1", updated_by: "u1",
    created_at: 1000, updated_at: 1000, published_at: 0, deleted_at: 0, direction: "",
  },
  {
    id: "page2", title: "Meeting Notes", slug: "meeting", content: "",
    text_content: "",
    collection_id: "col1", parent_page_id: "", status: "active", icon: "📝",
    color: "", full_width: false, is_pinned: false, is_template: false,
    template_id: "", sort_order: 1, created_by: "u1", updated_by: "u1",
    created_at: 900, updated_at: 900, published_at: 0, deleted_at: 0, direction: "",
  },
];

const sampleCollections = [
  { id: "col1", name: "Engineering", slug: "eng", description: "", parent_id: "",
    icon: "⚙️", color: "#3b82f6", sort_order: 0, created_by: "u1", created_at: 500, updated_at: 500 },
];

function setupMocks(options?: { resolveData?: boolean; errorMsg?: string }) {
  const { resolveData = true, errorMsg } = options ?? {};
  if (errorMsg) {
    mockPagesList.mockRejectedValue(new Error(errorMsg));
    mockCollectionsList.mockRejectedValue(new Error(errorMsg));
  } else if (resolveData) {
    mockPagesList.mockResolvedValue(samplePages);
    mockCollectionsList.mockResolvedValue(sampleCollections);
  } else {
    // empty data
    mockPagesList.mockResolvedValue([]);
    mockCollectionsList.mockResolvedValue([]);
  }
}

function renderGraph() {
  return render(<GraphView />);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("GraphView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Loading state ───────────────────────────────────────────────────────────

  it("shows spinner while loading", () => {
    setupMocks();
    renderGraph();
    expect(screen.getByText("Loading graph data...")).toBeInTheDocument();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("does not render graph elements during loading", () => {
    setupMocks();
    renderGraph();
    expect(screen.queryByText("Graph View")).not.toBeInTheDocument();
    expect(screen.queryByText("Legend")).not.toBeInTheDocument();
  });

  // ─── Error state ─────────────────────────────────────────────────────────────

  it("shows error message when API fails", async () => {
    setupMocks({ errorMsg: "Network error" });
    renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("renders error in a styled container", async () => {
    setupMocks({ errorMsg: "Failed to load graph data" });
    renderGraph();
    await waitFor(() => {
      const errEl = screen.getByText("Failed to load graph data");
      expect(errEl.className).toContain("text-red");
    });
  });

  // ─── Rendered state ───────────────────────────────────────────────────────────

  it("renders Graph View title and header when data loads", async () => {
    setupMocks();
    renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Graph View")).toBeInTheDocument();
    });
  });

  it("shows node and link counts in header", async () => {
    setupMocks();
    renderGraph();
    // 2 pages + 1 collection = 3 nodes, 3 links (2 collection + 1 backlink)
    await waitFor(() => {
      expect(screen.getByText(/3 nodes/)).toBeInTheDocument();
      expect(screen.getByText(/3 links/)).toBeInTheDocument();
    });
  });

  it("renders filter checkboxes (C, P/C, BL)", async () => {
    setupMocks();
    renderGraph();
    await waitFor(() => {
      expect(screen.getByLabelText("C")).toBeInTheDocument();
      expect(screen.getByLabelText("P/C")).toBeInTheDocument();
      expect(screen.getByLabelText("BL")).toBeInTheDocument();
    });
  });

  it("renders zoom buttons", async () => {
    setupMocks();
    renderGraph();
    await waitFor(() => {
      expect(screen.getByTitle("Zoom in")).toBeInTheDocument();
      expect(screen.getByTitle("Zoom out")).toBeInTheDocument();
      expect(screen.getByTitle("Reset")).toBeInTheDocument();
    });
  });

  it("renders legend with three items", async () => {
    setupMocks();
    renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Legend")).toBeInTheDocument();
      expect(screen.getByText("Parent/Child")).toBeInTheDocument();
      expect(screen.getByText("Collection")).toBeInTheDocument();
      expect(screen.getByText("Backlink")).toBeInTheDocument();
    });
  });

  it("renders an SVG element for the graph", async () => {
    setupMocks();
    const { container } = renderGraph();
    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  // ─── Empty data state ─────────────────────────────────────────────────────────

  it("renders header with zero nodes and links when no data", async () => {
    setupMocks({ resolveData: false });
    renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Graph View")).toBeInTheDocument();
      expect(screen.getByText(/0 nodes/)).toBeInTheDocument();
      expect(screen.getByText(/0 links/)).toBeInTheDocument();
    });
  });

  // ─── Interaction ──────────────────────────────────────────────────────────────

  it("opens info panel when clicking on a collection node", async () => {
    setupMocks();
    const { container } = renderGraph();
    // Wait for data to load and D3 to render circles
    await waitFor(() => {
      expect(screen.getByText("Graph View")).toBeInTheDocument();
    });
    // D3 creates circles inside SVG — click the first collection circle (r=18)
    const circles = container.querySelectorAll("svg circle");
    expect(circles.length).toBeGreaterThan(0);
    // The collection node has radius 18
    const colCircle = Array.from(circles).find(
      (c) => c.getAttribute("r") === "18",
    );
    expect(colCircle).toBeTruthy();
    fireEvent.click(colCircle!);
    // Info panel should appear — look for the "Close" button inside it
    await waitFor(() => {
      expect(screen.getByText("Close")).toBeInTheDocument();
    });
    // The info panel shows the title and type
    const panels = screen.getAllByText(/Collection/);
    const infoPanelText = panels.find(t => t.textContent?.includes("Engineering"));
    expect(infoPanelText).toBeTruthy();
  });

  it("info panel shows 'Open page' button for page nodes", async () => {
    setupMocks();
    const { container } = renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Graph View")).toBeInTheDocument();
    });
    // Click a page node (r=10)
    const circles = container.querySelectorAll("svg circle");
    const pageCircle = Array.from(circles).find(
      (c) => c.getAttribute("r") === "10",
    );
    expect(pageCircle).toBeTruthy();
    fireEvent.click(pageCircle!);
    await waitFor(() => {
      expect(screen.getByText("Open page")).toBeInTheDocument();
    });
  });

  it("navigates to page on double-click of a page node", async () => {
    setupMocks();
    const { container } = renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Graph View")).toBeInTheDocument();
    });
    const circles = container.querySelectorAll("svg circle");
    const pageCircle = Array.from(circles).find(
      (c) => c.getAttribute("r") === "10",
    );
    expect(pageCircle).toBeTruthy();
    fireEvent.dblClick(pageCircle!);
    expect(mockNavigate).toHaveBeenCalledWith("/page/page1");
  });

  it("does not navigate on double-click of a collection node", async () => {
    setupMocks();
    const { container } = renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Graph View")).toBeInTheDocument();
    });
    const circles = container.querySelectorAll("svg circle");
    const colCircle = Array.from(circles).find(
      (c) => c.getAttribute("r") === "18",
    );
    expect(colCircle).toBeTruthy();
    fireEvent.dblClick(colCircle!);
    // Collections should NOT navigate - isCollection=true prevents it
    const pageNavCalls = mockNavigate.mock.calls.filter(
      (args: any[]) => typeof args[0] === "string" && args[0].startsWith("/page/")
    );
    expect(pageNavCalls).toHaveLength(0);
  });

  it("navigates via 'Open page' button in info panel", async () => {
    setupMocks();
    const { container } = renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Graph View")).toBeInTheDocument();
    });
    // Click a page node to open info panel
    const circles = container.querySelectorAll("svg circle");
    const pageCircle = Array.from(circles).find(
      (c) => c.getAttribute("r") === "10",
    );
    fireEvent.click(pageCircle!);
    await waitFor(() => {
      expect(screen.getByText("Open page")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Open page"));
    expect(mockNavigate).toHaveBeenCalledWith("/page/page1");
  });

  it("closes info panel via 'Close' button", async () => {
    setupMocks();
    const { container } = renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Graph View")).toBeInTheDocument();
    });
    // Select a node to open panel
    const circles = container.querySelectorAll("svg circle");
    const pageCircle = Array.from(circles).find(
      (c) => c.getAttribute("r") === "10",
    );
    fireEvent.click(pageCircle!);
    await waitFor(() => {
      expect(screen.getByText("Open page")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Close"));
    await waitFor(() => {
      expect(screen.queryByText("Open page")).not.toBeInTheDocument();
    });
  });

  // ─── Filter toggles ──────────────────────────────────────────────────────────

  it("toggles collection filter checkbox", async () => {
    setupMocks();
    renderGraph();
    await waitFor(() => {
      expect(screen.getByLabelText("C")).toBeInTheDocument();
    });
    const cb = screen.getByLabelText("C") as HTMLInputElement;
    expect(cb.checked).toBe(true);
    fireEvent.click(cb);
    expect(cb.checked).toBe(false);
  });

  // ─── Accessibility ────────────────────────────────────────────────────────────

  it("has no accessibility violations while loading", async () => {
    setupMocks();
    const { container } = renderGraph();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations when loaded with data", async () => {
    setupMocks();
    const { container } = renderGraph();
    await waitFor(() => {
      expect(screen.getByText("Graph View")).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

