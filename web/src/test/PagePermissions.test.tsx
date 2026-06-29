import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockPermList = vi.fn();
const mockUsersList = vi.fn();
const mockGroupsList = vi.fn();
const mockPermSet = vi.fn();
const mockPermRemove = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    pagePermissions: {
      list: (...a: unknown[]) => mockPermList(...a),
      set: (...a: unknown[]) => mockPermSet(...a),
      remove: (...a: unknown[]) => mockPermRemove(...a),
    },
    users: { list: (...a: unknown[]) => mockUsersList(...a) },
    groups: { list: (...a: unknown[]) => mockGroupsList(...a) },
  },
  PagePermission: class {},
  User: class {},
  Group: class {},
}));

import { PagePermissions } from "../components/PagePermissions";

// ─── Sample data ──────────────────────────────────────────────────────────────

const samplePermissions = [
  { id: "perm1", page_id: "p1", user_id: "u1", group_id: null, role: "admin", created_at: 1000 },
  { id: "perm2", page_id: "p1", user_id: "u2", group_id: null, role: "viewer", created_at: 900 },
  { id: "perm3", page_id: "p1", user_id: null, group_id: "g1", role: "editor", created_at: 800 },
];

const sampleUsers = [
  { id: "u1", name: "Alice", email: "alice@wiki.local" },
  { id: "u2", name: "Bob", email: "bob@wiki.local" },
  { id: "u3", name: "Charlie", email: "charlie@wiki.local" },
];

const sampleGroups = [
  { id: "g1", name: "Editors" },
  { id: "g2", name: "Viewers" },
];

function renderPerms(props: Partial<Parameters<typeof PagePermissions>[0]> = {}) {
  const onClose = props.onClose ?? vi.fn();
  return {
    onClose,
    ...render(
      <PagePermissions
        pageId={props.pageId ?? "p1"}
        userId={props.userId ?? "u1"}
        onClose={onClose}
      />,
    ),
  };
}

describe("PagePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermList.mockResolvedValue(samplePermissions);
    mockUsersList.mockResolvedValue(sampleUsers);
    mockGroupsList.mockResolvedValue(sampleGroups);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it("renders the modal with title", () => {
    renderPerms();
    expect(screen.getByText("Page Permissions")).toBeInTheDocument();
  });

  it("calls all three APIs on mount", () => {
    renderPerms();
    expect(mockPermList).toHaveBeenCalledWith("p1");
    expect(mockUsersList).toHaveBeenCalled();
    expect(mockGroupsList).toHaveBeenCalled();
  });

  it("shows close button", async () => {
    renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    const closeBtn = screen.getByRole("button", { name: /close/i });
    expect(closeBtn).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const { onClose } = renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    const closeBtn = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it("shows loading spinner while fetching", () => {
    mockPermList.mockReturnValue(new Promise(() => {}));
    renderPerms();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  // ─── Permission list ─────────────────────────────────────────────────────

  it("renders permission items with role badges", async () => {
    renderPerms();
    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
      expect(screen.getByText("viewer")).toBeInTheDocument();
      expect(screen.getByText("editor")).toBeInTheDocument();
    });
  });

  it("shows user names for user permissions", async () => {
    renderPerms();
    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
    });
  });

  it("shows group name for group permissions", async () => {
    renderPerms();
    await waitFor(() => {
      expect(screen.getByText("Editors")).toBeInTheDocument();
    });
  });

  // ─── Empty state ─────────────────────────────────────────────────────────

  it("shows empty state when no permissions", async () => {
    mockPermList.mockResolvedValue([]);
    renderPerms();
    await waitFor(() => {
      expect(screen.getByText(/inherits collection-level permissions/)).toBeInTheDocument();
    });
  });

  // ─── Add user permission form ────────────────────────────────────────────

  it("shows add user permission button", async () => {
    renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    expect(screen.getByText("Add user permission")).toBeInTheDocument();
  });

  it("opens add user form on click", async () => {
    renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add user permission"));
    expect(screen.getByText("Add user permission")).toBeInTheDocument();
    // Form should show select
    expect(screen.getByText("Select user...")).toBeInTheDocument();
  });

  it("calls api.pagePermissions.set when adding user permission", async () => {
    mockPermSet.mockResolvedValue(undefined);
    renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add user permission"));
    // Select a user
    const userSelect = screen.getByLabelText("Select user");
    fireEvent.change(userSelect, { target: { value: "u3" } });
    // Click Add
    fireEvent.click(screen.getByText("Add"));
    await waitFor(() => {
      expect(mockPermSet).toHaveBeenCalledWith("p1", "u3", "", "viewer");
    });
  });

  it("cancels add user form", async () => {
    renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add user permission"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Select user...")).not.toBeInTheDocument();
  });

  // ─── Add group permission form ───────────────────────────────────────────

  it("shows add group permission button", async () => {
    renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    expect(screen.getByText("Add group permission")).toBeInTheDocument();
  });

  it("opens add group form on click", async () => {
    renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add group permission"));
    expect(screen.getByText("Add group permission")).toBeInTheDocument();
    expect(screen.getByText("Select group...")).toBeInTheDocument();
  });

  // ─── Remove permission ───────────────────────────────────────────────────

  it("shows remove button for each permission", async () => {
    renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    const removeBtns = document.querySelectorAll('[title="Remove permission"]');
    expect(removeBtns.length).toBe(3);
  });

  it("calls api.pagePermissions.remove on confirm", async () => {
    mockPermRemove.mockResolvedValue(undefined);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmMock);

    renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    const removeBtns = document.querySelectorAll('[title="Remove permission"]');
    fireEvent.click(removeBtns[0]);
    await waitFor(() => {
      expect(mockPermRemove).toHaveBeenCalledWith("perm1");
    });
    vi.unstubAllGlobals();
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations with permissions loaded", async () => {
    const { container } = renderPerms();
    await waitFor(() => expect(screen.getByText((c) => c.includes("Alice"))).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations in empty state", async () => {
    mockPermList.mockResolvedValue([]);
    const { container } = renderPerms();
    await waitFor(() => expect(screen.getByText(/inherits collection-level permissions/)).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
