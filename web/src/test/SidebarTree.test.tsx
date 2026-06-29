import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { SidebarTree } from "../components/SidebarTree";
import type { Page, Collection } from "../lib/api";

// ─── Sample data factories ─────────────────────────────────────────────────────

function makePage(overrides: Partial<Page> & { id: string; title?: string }): Page {
  return {
    id: overrides.id,
    title: overrides.title ?? "Untitled",
    slug: "",
    content: "",
    text_content: overrides.text_content ?? "",
    collection_id: overrides.collection_id ?? "",
    parent_page_id: "",
    status: overrides.status ?? "",
    icon: overrides.icon ?? "",
    color: overrides.color ?? "",
    full_width: false,
    is_pinned: overrides.is_pinned ?? false,
    is_template: overrides.is_template ?? false,
    template_id: "",
    sort_order: 0,
    created_by: "",
    updated_by: "",
    created_at: 0,
    updated_at: 0,
    published_at: 0,
    deleted_at: 0,
    direction: "",
  };
}

function makeCol(overrides: Partial<Collection> & { id: string; name?: string }): Collection {
  return {
    id: overrides.id,
    name: overrides.name ?? "Collection",
    slug: "",
    description: "",
    parent_id: overrides.parent_id ?? "",
    icon: overrides.icon ?? "",
    color: "",
    sort_order: 0,
    created_by: "",
    created_at: 0,
    updated_at: 0,
  };
}

// ─── Default props builder ─────────────────────────────────────────────────────

function buildDefaultProps() {
  const toggleCollection = vi.fn();
  const handlePageClick = vi.fn();
  const handleDragStart = vi.fn();
  const handleColDragStart = vi.fn();
  const handleDragOver = vi.fn();
  const handleDragLeave = vi.fn();
  const handleDragEnd = vi.fn();
  const handleDropOnCollection = vi.fn();
  const handleDropOnPage = vi.fn();
  const setDragOverTarget = vi.fn();
  const togglePageSelection = vi.fn();
  const clearSelection = vi.fn();
  const handleBatchArchive = vi.fn().mockResolvedValue(undefined);
  const handleBatchDelete = vi.fn().mockResolvedValue(undefined);
  const handleBatchMove = vi.fn().mockResolvedValue(undefined);
  const handleBatchTag = vi.fn().mockResolvedValue(undefined);
  const openEditCol = vi.fn();
  const openCreateCol = vi.fn();
  const openTemplates = vi.fn();
  const loadTrashPage = vi.fn();
  const setContextMenu = vi.fn();
  const setPageLimits = vi.fn();
  const setBatchMoveOpen = vi.fn();
  const setBatchTagOpen = vi.fn();
  const setBatchTagName = vi.fn();
  const setBatchTagValue = vi.fn();
  const navigate = vi.fn();
  const isActive = vi.fn().mockReturnValue(false);

  return {
    toggleCollection,
    handlePageClick,
    handleDragStart,
    handleColDragStart,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
    handleDropOnCollection,
    handleDropOnPage,
    setDragOverTarget,
    togglePageSelection,
    clearSelection,
    handleBatchArchive,
    handleBatchDelete,
    handleBatchMove,
    handleBatchTag,
    openEditCol,
    openCreateCol,
    openTemplates,
    loadTrashPage,
    setContextMenu,
    setPageLimits,
    setBatchMoveOpen,
    setBatchTagOpen,
    setBatchTagName,
    setBatchTagValue,
    navigate,
    isActive,
  };
}

function renderSidebarTree(overrides: Partial<Parameters<typeof SidebarTree>[0]> = {}) {
  const defaults = buildDefaultProps();
  const props = {
    collectionTree: [],
    pages: [],
    pagesByCollection: {},
    collections: [],
    favoritePages: [],
    searchQuery: "",
    loading: false,
    expandedCollections: new Set<string>(),
    dragPageId: null,
    dragColId: null,
    dragOverTarget: null,
    selectedPageIds: new Set<string>(),
    pageLimits: {},
    batchMoveOpen: false,
    batchTagOpen: false,
    batchTagName: "",
    batchTagValue: "",
    ...defaults,
    ...overrides,
  };
  return {
    ...render(<SidebarTree {...props} />),
    props,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("SidebarTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Loading state ──────────────────────────────────────────────────────────

  it("shows loading indicator when loading is true", () => {
    renderSidebarTree({ loading: true });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("does not show loading indicator when loading is false", () => {
    renderSidebarTree({ loading: false });
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  // ─── Empty state ───────────────────────────────────────────────────────────

  it("shows empty welcome state when there are no collections or pages", () => {
    renderSidebarTree({ collections: [], pagesByCollection: {} });
    expect(screen.getByText("Welcome! Your wiki is empty.")).toBeInTheDocument();
    expect(screen.getByText("Create first page")).toBeInTheDocument();
  });

  it("navigates to /new when 'Create first page' is clicked", () => {
    const navigate = vi.fn();
    renderSidebarTree({ collections: [], pagesByCollection: {}, navigate });
    fireEvent.click(screen.getByText("Create first page"));
    expect(navigate).toHaveBeenCalledWith("/new");
  });

  it("does not show empty state when collections exist", () => {
    const col = makeCol({ id: "c1", name: "Docs" });
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: {},
    });
    expect(screen.queryByText("Welcome! Your wiki is empty.")).not.toBeInTheDocument();
  });

  // ─── Favorites section ─────────────────────────────────────────────────────

  it("renders favorites section with favorite pages", () => {
    const favPages = [
      makePage({ id: "p1", title: "Fav Page 1" }),
      makePage({ id: "p2", title: "Fav Page 2" }),
    ];
    renderSidebarTree({ favoritePages: favPages });
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("Fav Page 1")).toBeInTheDocument();
    expect(screen.getByText("Fav Page 2")).toBeInTheDocument();
  });

  it("hides favorites section when there are no favorite pages", () => {
    renderSidebarTree({ favoritePages: [] });
    expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
  });

  it("navigates when a favorite page button is clicked", () => {
    const navigate = vi.fn();
    const favPages = [makePage({ id: "p1", title: "Fav Page" })];
    renderSidebarTree({ favoritePages: favPages, navigate });
    fireEvent.click(screen.getByText("Fav Page"));
    expect(navigate).toHaveBeenCalledWith("/page/p1");
  });

  it("applies active class to favorite page that is active", () => {
    const isActive = vi.fn((id: string) => id === "p1");
    const favPages = [
      makePage({ id: "p1", title: "Active Fav" }),
      makePage({ id: "p2", title: "Inactive Fav" }),
    ];
    renderSidebarTree({ favoritePages: favPages, isActive });
    const activeBtn = screen.getByText("Active Fav").closest("button");
    expect(activeBtn?.className).toContain("bg-primary");
  });

  // ─── Collection tree ────────────────────────────────────────────────────────

  it("renders collection tree with collection names", () => {
    const col = makeCol({ id: "c1", name: "My Collection" });
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      expandedCollections: new Set(["c1"]),
    });
    expect(screen.getByText("My Collection")).toBeInTheDocument();
  });

  it("shows page count badge for each collection", () => {
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({ id: "p1", collection_id: "c1" })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      expandedCollections: new Set(["c1"]),
    });
    // Page count shows as "1" in the badge
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows child collection count with +N notation", () => {
    const child = makeCol({ id: "c2", name: "Child", parent_id: "c1" });
    const parent = makeCol({ id: "c1", name: "Parent" });
    renderSidebarTree({
      collections: [parent, child],
      collectionTree: [{ ...parent, children: [{ ...child, children: [] }] }],
      expandedCollections: new Set(["c1"]),
    });
    // Parent should show " +1" for 1 child
    expect(screen.getByText(/\+1/)).toBeInTheDocument();
  });

  it("renders nested child collections when parent is expanded", () => {
    const child = makeCol({ id: "c2", name: "Child Col", parent_id: "c1" });
    const parent = makeCol({ id: "c1", name: "Parent" });
    renderSidebarTree({
      collections: [parent, child],
      collectionTree: [{ ...parent, children: [{ ...child, children: [] }] }],
      expandedCollections: new Set(["c1"]),
    });
    expect(screen.getByText("Child Col")).toBeInTheDocument();
  });

  it("calls toggleCollection when a collection header is clicked", () => {
    const toggleCollection = vi.fn();
    const col = makeCol({ id: "c1", name: "Docs" });
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      toggleCollection,
      expandedCollections: new Set(["c1"]),
    });
    fireEvent.click(screen.getByText("Docs"));
    expect(toggleCollection).toHaveBeenCalledWith("c1");
  });

  it("shows pages inside an expanded collection", () => {
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({ id: "p1", title: "Page One", collection_id: "c1" })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      expandedCollections: new Set(["c1"]),
    });
    expect(screen.getByText("Page One")).toBeInTheDocument();
  });

  it("does not show pages inside a collapsed collection", () => {
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({ id: "p1", title: "Page One", collection_id: "c1" })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      expandedCollections: new Set(), // collapsed
    });
    expect(screen.queryByText("Page One")).not.toBeInTheDocument();
  });

  it("calls setContextMenu on collection right-click", () => {
    const setContextMenu = vi.fn();
    const col = makeCol({ id: "c1", name: "Docs" });
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      setContextMenu,
    });
    const colBtn = screen.getByText("Docs");
    fireEvent.contextMenu(colBtn);
    expect(setContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ colId: "c1" })
    );
  });

  it("calls handleColDragStart on collection drag start", () => {
    const handleColDragStart = vi.fn();
    const col = makeCol({ id: "c1", name: "Docs" });
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      handleColDragStart,
    });
    const colBtn = screen.getByText("Docs");
    fireEvent.dragStart(colBtn);
    expect(handleColDragStart).toHaveBeenCalledWith(expect.any(Object), "c1");
  });

  it("calls handleDropOnCollection on collection drop", () => {
    const handleDropOnCollection = vi.fn();
    const col = makeCol({ id: "c1", name: "Docs" });
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      handleDropOnCollection,
    });
    const colBtn = screen.getByText("Docs");
    fireEvent.drop(colBtn);
    expect(handleDropOnCollection).toHaveBeenCalledWith(expect.any(Object), "c1");
  });

  it("calls openEditCol when the ... button is clicked", () => {
    const openEditCol = vi.fn();
    const col = makeCol({ id: "c1", name: "Docs" });
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      openEditCol,
    });
    // The MoreHorizontal button is the edit button
    const editBtn = screen.getByText("Docs").closest("div")?.querySelector("button:last-child");
    if (editBtn) fireEvent.click(editBtn);
    expect(openEditCol).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" }));
  });

  // ─── Page interactions ─────────────────────────────────────────────────────

  it("calls handlePageClick when a page is clicked", () => {
    const handlePageClick = vi.fn();
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({ id: "p1", title: "Clickable", collection_id: "c1" })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      handlePageClick,
      expandedCollections: new Set(["c1"]),
    });
    fireEvent.click(screen.getByText("Clickable"));
    expect(handlePageClick).toHaveBeenCalledWith("p1", expect.any(Object));
  });

  it("calls handleDragStart when dragging a page", () => {
    const handleDragStart = vi.fn();
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({ id: "p1", title: "Draggable", collection_id: "c1" })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      handleDragStart,
      expandedCollections: new Set(["c1"]),
    });
    const pageEl = screen.getByText("Draggable").closest("[draggable]");
    if (pageEl) fireEvent.dragStart(pageEl);
    expect(handleDragStart).toHaveBeenCalledWith(expect.any(Object), "p1");
  });

  it("calls handleDropOnPage when dropping on a page", () => {
    const handleDropOnPage = vi.fn();
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({ id: "p1", title: "Drop Target", collection_id: "c1" })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      handleDropOnPage,
      expandedCollections: new Set(["c1"]),
    });
    const pageEl = screen.getByText("Drop Target").closest("[draggable]");
    if (pageEl) fireEvent.drop(pageEl);
    expect(handleDropOnPage).toHaveBeenCalledWith(expect.any(Object), "p1");
  });

  it("calls setContextMenu on page right-click in uncategorized", () => {
    const setContextMenu = vi.fn();
    const pages = [makePage({ id: "p1", title: "Right-click Me" })];
    renderSidebarTree({
      pagesByCollection: { uncategorized: pages },
      setContextMenu,
      expandedCollections: new Set(["uncategorized"]),
    });
    fireEvent.contextMenu(screen.getByText("Right-click Me"));
    expect(setContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ pageId: "p1" })
    );
  });

  it("calls togglePageSelection when selection checkbox is clicked", () => {
    const togglePageSelection = vi.fn();
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({ id: "p1", title: "Selectable", collection_id: "c1" })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      togglePageSelection,
      expandedCollections: new Set(["c1"]),
    });
    // The selection checkbox has title "Select"
    const selectBtn = screen.getByTitle("Select");
    fireEvent.click(selectBtn);
    expect(togglePageSelection).toHaveBeenCalledWith("p1", expect.any(Object));
  });

  it("shows selected state with check-square icon", () => {
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({ id: "p1", title: "Selected Page", collection_id: "c1" })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      selectedPageIds: new Set(["p1"]),
      expandedCollections: new Set(["c1"]),
    });
    // When selected, the button title changes to "Deselect"
    expect(screen.getByTitle("Deselect")).toBeInTheDocument();
  });

  // ─── Uncategorized section ─────────────────────────────────────────────────

  it("renders uncategorized section when there are pages without a collection", () => {
    const pages = [makePage({ id: "p1", title: "Orphan" })];
    renderSidebarTree({
      pagesByCollection: { uncategorized: pages },
      expandedCollections: new Set(["uncategorized"]),
    });
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
    expect(screen.getByText("Orphan")).toBeInTheDocument();
  });

  it("hides uncategorized when there are no uncategorized pages", () => {
    renderSidebarTree({ pagesByCollection: {} });
    expect(screen.queryByText("Uncategorized")).not.toBeInTheDocument();
  });

  it("toggles uncategorized section on click", () => {
    const toggleCollection = vi.fn();
    const pages = [makePage({ id: "p1", title: "Orphan" })];
    renderSidebarTree({
      pagesByCollection: { uncategorized: pages },
      toggleCollection,
      expandedCollections: new Set(["uncategorized"]),
    });
    fireEvent.click(screen.getByText("Uncategorized"));
    expect(toggleCollection).toHaveBeenCalledWith("uncategorized");
  });

  // ─── Status badges ─────────────────────────────────────────────────────────

  it("shows Draft badge for draft pages", () => {
    const pages = [makePage({ id: "p1", status: "draft", title: "Drafty" })];
    renderSidebarTree({
      pagesByCollection: { uncategorized: pages },
      expandedCollections: new Set(["uncategorized"]),
    });
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("shows Archived badge for archived pages", () => {
    const pages = [makePage({ id: "p1", status: "archived", title: "Old" })];
    renderSidebarTree({
      pagesByCollection: { uncategorized: pages },
      expandedCollections: new Set(["uncategorized"]),
    });
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("shows Template badge for template pages", () => {
    const pages = [makePage({ id: "p1", title: "Templ", is_template: true })];
    renderSidebarTree({
      pagesByCollection: { uncategorized: pages },
      expandedCollections: new Set(["uncategorized"]),
    });
    expect(screen.getByText("Template")).toBeInTheDocument();
  });

  it("does not show any status badge for normal pages", () => {
    const pages = [makePage({ id: "p1", title: "Normal", status: "" })];
    renderSidebarTree({
      pagesByCollection: { uncategorized: pages },
      expandedCollections: new Set(["uncategorized"]),
    });
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Archived")).not.toBeInTheDocument();
    expect(screen.queryByText("Template")).not.toBeInTheDocument();
  });

  // ─── Search highlighting ───────────────────────────────────────────────────

  it("shows highlighted search snippet when searchQuery matches text_content", () => {
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({
      id: "p1",
      title: "Searchable",
      collection_id: "c1",
      text_content: "This page contains the keyword hello world in its content",
    })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      expandedCollections: new Set(["c1"]),
      searchQuery: "keyword",
    });
    // The snippet should include <mark> elements around matched text
    const marks = document.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent).toBe("keyword");
  });

  it("does not render search snippet when searchQuery is empty", () => {
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({
      id: "p1",
      title: "Searchable",
      collection_id: "c1",
      text_content: "keyword content here",
    })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      expandedCollections: new Set(["c1"]),
      searchQuery: "",
    });
    const marks = document.querySelectorAll("mark");
    expect(marks.length).toBe(0);
  });

  it("renders truncated leading/trailing ellipsis in search snippet when needed", () => {
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({
      id: "p1",
      title: "Long Page",
      collection_id: "c1",
      text_content:
        "A very long prefix that goes way beyond the snippet window " +
        "before the actual keyword finally appears somewhere in the " +
        "middle of this lengthy text content that we are using for test",
    })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      expandedCollections: new Set(["c1"]),
      searchQuery: "keyword",
    });
    // Snapshot: the snippet should contain the keyword in a <mark>
    const marks = document.querySelectorAll("mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].textContent).toContain("keyword");
  });

  // ─── Show more button ──────────────────────────────────────────────────────

  it("shows 'Show N more' button when page count exceeds limit", () => {
    const col = makeCol({ id: "c1", name: "Big" });
    const pages = Array.from({ length: 51 }, (_, i) =>
      makePage({ id: `p${i}`, title: `Page ${i}`, collection_id: "c1" })
    );
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      expandedCollections: new Set(["c1"]),
      pageLimits: {},
    });
    // 51 pages, limit 50, so "Show 1 more"
    expect(screen.getByText(/Show 1 more/)).toBeInTheDocument();
  });

  it("calls setPageLimits when 'Show more' is clicked", () => {
    const setPageLimits = vi.fn();
    const col = makeCol({ id: "c1", name: "Big" });
    const pages = Array.from({ length: 51 }, (_, i) =>
      makePage({ id: `p${i}`, title: `Page ${i}`, collection_id: "c1" })
    );
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      expandedCollections: new Set(["c1"]),
      setPageLimits,
      pageLimits: {},
    });
    fireEvent.click(screen.getByText(/Show 1 more/));
    expect(setPageLimits).toHaveBeenCalledTimes(1);
  });

  it("does not show 'Show more' when page count is at or under limit", () => {
    const col = makeCol({ id: "c1", name: "Small" });
    const pages = Array.from({ length: 50 }, (_, i) =>
      makePage({ id: `p${i}`, title: `Page ${i}`, collection_id: "c1" })
    );
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      expandedCollections: new Set(["c1"]),
    });
    expect(screen.queryByText(/Show.*more/)).not.toBeInTheDocument();
  });

  // ─── Batch action bar ──────────────────────────────────────────────────────

  it("shows batch action bar when pages are selected", () => {
    const col = makeCol({ id: "c1", name: "Docs" });
    const pages = [makePage({ id: "p1", title: "Selected", collection_id: "c1" })];
    renderSidebarTree({
      collections: [col],
      collectionTree: [{ ...col, children: [] }],
      pagesByCollection: { c1: pages },
      selectedPageIds: new Set(["p1"]),
      expandedCollections: new Set(["c1"]),
    });
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByText("Move")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.getByText("Tag")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("hides batch action bar when no pages are selected", () => {
    renderSidebarTree({ selectedPageIds: new Set() });
    expect(screen.queryByText("selected")).not.toBeInTheDocument();
    expect(screen.queryByText("Move")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
    expect(screen.queryByText("Tag")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("calls clearSelection when Clear button is clicked", () => {
    const clearSelection = vi.fn();
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      clearSelection,
    });
    fireEvent.click(screen.getByText("Clear"));
    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it("calls handleBatchArchive when Archive button is clicked", () => {
    const handleBatchArchive = vi.fn().mockResolvedValue(undefined);
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      handleBatchArchive,
    });
    fireEvent.click(screen.getByText("Archive"));
    expect(handleBatchArchive).toHaveBeenCalledOnce();
  });

  it("calls handleBatchDelete when Delete button is clicked", () => {
    const handleBatchDelete = vi.fn().mockResolvedValue(undefined);
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      handleBatchDelete,
    });
    fireEvent.click(screen.getByText("Delete"));
    expect(handleBatchDelete).toHaveBeenCalledOnce();
  });

  it("opens batch move dialog when Move button is clicked", () => {
    const setBatchMoveOpen = vi.fn();
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      setBatchMoveOpen,
    });
    fireEvent.click(screen.getByText("Move"));
    expect(setBatchMoveOpen).toHaveBeenCalledWith(true);
  });

  it("opens batch tag dialog when Tag button is clicked", () => {
    const setBatchTagOpen = vi.fn();
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      setBatchTagOpen,
    });
    fireEvent.click(screen.getByText("Tag"));
    expect(setBatchTagOpen).toHaveBeenCalledWith(true);
  });

  // ─── Batch Move dialog ────────────────────────────────────────────────────

  it("renders batch move dialog when batchMoveOpen is true", () => {
    const col = makeCol({ id: "c1", name: "Target Col" });
    renderSidebarTree({
      collections: [col],
      selectedPageIds: new Set(["p1"]),
      batchMoveOpen: true,
    });
    expect(screen.getByText(/Move 1 page/)).toBeInTheDocument();
    expect(screen.getByText("Target Col")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("calls handleBatchMove when a collection is clicked in move dialog", () => {
    const handleBatchMove = vi.fn().mockResolvedValue(undefined);
    const col = makeCol({ id: "c1", name: "Target" });
    renderSidebarTree({
      collections: [col],
      selectedPageIds: new Set(["p1"]),
      batchMoveOpen: true,
      handleBatchMove,
    });
    fireEvent.click(screen.getByText("Target"));
    expect(handleBatchMove).toHaveBeenCalledWith("c1");
  });

  it("calls handleBatchMove with empty string for Uncategorized in move dialog", () => {
    const handleBatchMove = vi.fn().mockResolvedValue(undefined);
    renderSidebarTree({
      collections: [],
      selectedPageIds: new Set(["p1"]),
      batchMoveOpen: true,
      handleBatchMove,
    });
    fireEvent.click(screen.getByText("Uncategorized"));
    expect(handleBatchMove).toHaveBeenCalledWith("");
  });

  it("closes batch move dialog when Cancel is clicked", () => {
    const setBatchMoveOpen = vi.fn();
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchMoveOpen: true,
      setBatchMoveOpen,
    });
    fireEvent.click(screen.getByText("Cancel"));
    expect(setBatchMoveOpen).toHaveBeenCalledWith(false);
  });

  it("closes batch move dialog when backdrop is clicked", () => {
    const setBatchMoveOpen = vi.fn();
    const { container } = renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchMoveOpen: true,
      setBatchMoveOpen,
    });
    // The backdrop is the fixed overlay div (first child after the dialog portal)
    const backdrop = container.querySelector(".fixed.inset-0");
    if (backdrop) fireEvent.click(backdrop);
    expect(setBatchMoveOpen).toHaveBeenCalledWith(false);
  });

  // ─── Batch Tag dialog ──────────────────────────────────────────────────────

  it("renders batch tag dialog when batchTagOpen is true", () => {
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchTagOpen: true,
    });
    expect(screen.getByText(/Add tag to 1 page/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tag name/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tag value/)).toBeInTheDocument();
    expect(screen.getByText("Add Tag")).toBeInTheDocument();
    expect(screen.getAllByText("Cancel").length).toBeGreaterThanOrEqual(1);
  });

  it("calls setBatchTagName when tag name input changes", () => {
    const setBatchTagName = vi.fn();
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchTagOpen: true,
      setBatchTagName,
    });
    fireEvent.change(screen.getByPlaceholderText(/Tag name/), {
      target: { value: "department" },
    });
    expect(setBatchTagName).toHaveBeenCalledWith("department");
  });

  it("calls setBatchTagValue when tag value input changes", () => {
    const setBatchTagValue = vi.fn();
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchTagOpen: true,
      setBatchTagValue,
    });
    fireEvent.change(screen.getByPlaceholderText(/Tag value/), {
      target: { value: "engineering" },
    });
    expect(setBatchTagValue).toHaveBeenCalledWith("engineering");
  });

  it("calls handleBatchTag when Add Tag is clicked", () => {
    const handleBatchTag = vi.fn().mockResolvedValue(undefined);
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchTagOpen: true,
      handleBatchTag,
      batchTagName: "department",
    });
    fireEvent.click(screen.getByText("Add Tag"));
    expect(handleBatchTag).toHaveBeenCalledOnce();
  });

  it("disables Add Tag button when batchTagName is empty", () => {
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchTagOpen: true,
      batchTagName: "",
    });
    const addTagBtn = screen.getByText("Add Tag");
    expect(addTagBtn).toBeDisabled();
  });

  it("enables Add Tag button when batchTagName has value", () => {
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchTagOpen: true,
      batchTagName: "dept",
    });
    const addTagBtn = screen.getByText("Add Tag");
    expect(addTagBtn).not.toBeDisabled();
  });

  it("closes batch tag dialog when Cancel is clicked", () => {
    const setBatchTagOpen = vi.fn();
    renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchTagOpen: true,
      setBatchTagOpen,
    });
    // There are two Cancel buttons (one in tag dialog, one in move dialog).
    // The tag dialog's Cancel is inside the dialog with "Add tag to" text.
    const cancelBtns = screen.getAllByText("Cancel");
    // Find the one inside the tag dialog
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);
    expect(setBatchTagOpen).toHaveBeenCalledWith(false);
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations in default state", async () => {
    const { container } = renderSidebarTree();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations in empty state", async () => {
    const { container } = renderSidebarTree({
      collections: [],
      pagesByCollection: {},
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations in loading state", async () => {
    const { container } = renderSidebarTree({ loading: true });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations with batch move dialog open", async () => {
    const col = makeCol({ id: "c1", name: "Target" });
    const { container } = renderSidebarTree({
      collections: [col],
      selectedPageIds: new Set(["p1"]),
      batchMoveOpen: true,
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations with batch tag dialog open", async () => {
    const { container } = renderSidebarTree({
      selectedPageIds: new Set(["p1"]),
      batchTagOpen: true,
      batchTagName: "dept",
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
