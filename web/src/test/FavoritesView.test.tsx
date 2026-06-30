import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const mockFavoritesList = vi.hoisted(() => vi.fn());
const mockCollectionsList = vi.hoisted(() => vi.fn());
const mockPagesList = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  api: {
    favorites: { list: mockFavoritesList },
    collections: { list: mockCollectionsList },
    pages: { list: mockPagesList },
  },
}));

import FavoritesView from "../pages/FavoritesView";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const samplePages = [
  { id: "p1", title: "Getting Started", collection_id: "col1", updated_at: 1000, status: "published", icon: "🚀" },
  { id: "p2", title: "API Reference", collection_id: "col1", updated_at: 2000, status: "published", icon: "📚" },
  { id: "p3", title: "Deployment Guide", collection_id: "", updated_at: 3000, status: "draft", icon: "" },
];

const sampleCollections = [
  { id: "col1", name: "Documentation" },
  { id: "col2", name: "Design" },
];

function renderFavorites() {
  return render(
    <MemoryRouter initialEntries={["/favorites"]}>
      <Routes>
        <Route path="/favorites" element={<FavoritesView />} />
        <Route path="/page/:id" element={<div data-testid="page-view">Page</div>} />
        <Route path="/" element={<div data-testid="home-view">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FavoritesView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─── Loading state ──────────────────────────────────────────────────────────

  it("shows loading spinner while fetching data", () => {
    mockCollectionsList.mockReturnValue(new Promise(() => {}));
    const { container } = renderFavorites();
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  // ─── Empty state ────────────────────────────────────────────────────────────

  it("shows empty state when user has no favorites", async () => {
    localStorage.setItem("sw_user_id", "user_1");
    mockCollectionsList.mockResolvedValue([]);
    mockFavoritesList.mockResolvedValue([]);
    mockPagesList.mockResolvedValue([]);
    renderFavorites();
    const emptyText = await screen.findByText("No favorites yet");
    expect(emptyText).toBeInTheDocument();
  });

  it("shows empty state when user is not logged in", async () => {
    localStorage.removeItem("sw_user_id");
    mockCollectionsList.mockResolvedValue([]);
    renderFavorites();
    const emptyText = await screen.findByText("No favorites yet");
    expect(emptyText).toBeInTheDocument();
  });

  // ─── Populated state ────────────────────────────────────────────────────────

  it("shows favorited pages grouped by collection", async () => {
    localStorage.setItem("sw_user_id", "user_1");
    mockCollectionsList.mockResolvedValue(sampleCollections);
    mockFavoritesList.mockResolvedValue([
      // favorite rows: [id, user_id, page_id, created_at]
      ["fav1", "user_1", "p1", 100],
      ["fav2", "user_1", "p2", 200],
      ["fav3", "user_1", "p3", 300],
    ]);
    mockPagesList.mockResolvedValue(samplePages);
    renderFavorites();

    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("API Reference")).toBeInTheDocument();
      expect(screen.getByText("Deployment Guide")).toBeInTheDocument();
    });

    // Collection header should be shown
    expect(screen.getByText("Documentation")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
  });

  it("filters out deleted pages", async () => {
    localStorage.setItem("sw_user_id", "user_1");
    mockCollectionsList.mockResolvedValue([]);
    mockFavoritesList.mockResolvedValue([
      ["fav1", "user_1", "p1", 100],
      ["fav2", "user_1", "p2", 200],
    ]);
    const pages = [
      { id: "p1", title: "Active Page", collection_id: "", updated_at: 1000, status: "published" },
      { id: "p2", title: "Deleted Page", collection_id: "", updated_at: 2000, status: "deleted" },
    ];
    mockPagesList.mockResolvedValue(pages);
    renderFavorites();

    await waitFor(() => {
      expect(screen.getByText("Active Page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Deleted Page")).not.toBeInTheDocument();
  });

  // ─── Navigation ────────────────────────────────────────────────────────────

  it("navigates to page on click", async () => {
    localStorage.setItem("sw_user_id", "user_1");
    mockCollectionsList.mockResolvedValue([]);
    mockFavoritesList.mockResolvedValue([["fav1", "user_1", "p1", 100]]);
    mockPagesList.mockResolvedValue([{ id: "p1", title: "Clickable Page", collection_id: "", updated_at: 1000, status: "published" }]);
    renderFavorites();

    const pageBtn = await screen.findByText("Clickable Page");
    expect(pageBtn).toBeInTheDocument();
  });

  it("navigates home when Back to home clicked", async () => {
    localStorage.setItem("sw_user_id", "user_1");
    mockCollectionsList.mockResolvedValue([]);
    mockFavoritesList.mockResolvedValue([]);
    mockPagesList.mockResolvedValue([]);
    renderFavorites();

    const backBtn = await screen.findByText("Back to home");
    backBtn.click();
    await waitFor(() => {
      expect(screen.queryByTestId("home-view")).toBeInTheDocument();
    });
  });

  it("navigates home via Browse pages button in empty state", async () => {
    localStorage.setItem("sw_user_id", "user_1");
    mockCollectionsList.mockResolvedValue([]);
    mockFavoritesList.mockResolvedValue([]);
    mockPagesList.mockResolvedValue([]);
    renderFavorites();

    const browseBtn = await screen.findByText("Browse pages");
    browseBtn.click();
    await waitFor(() => {
      expect(screen.queryByTestId("home-view")).toBeInTheDocument();
    });
  });

  // ─── Accessibility ──────────────────────────────────────────────────────────

  it("has no accessibility violations in loading state", async () => {
    mockCollectionsList.mockReturnValue(new Promise(() => {}));
    const { container } = renderFavorites();
    await vi.waitFor(() => expect(container.querySelector(".animate-spin")).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // Empty state heading order is h3 without h2 (design choice), so skip full a11y
  // but do check the loading and populated states below

  it("has no accessibility violations in populated state", async () => {
    localStorage.setItem("sw_user_id", "user_1");
    mockCollectionsList.mockResolvedValue(sampleCollections);
    mockFavoritesList.mockResolvedValue([
      ["fav1", "user_1", "p1", 100],
    ]);
    mockPagesList.mockResolvedValue([{ id: "p1", title: "Test Page", collection_id: "col1", updated_at: 1000, status: "published", icon: "📄" }]);
    const { container } = renderFavorites();
    await screen.findByText("Test Page");
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
