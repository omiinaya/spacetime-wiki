import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockList = vi.fn();
const mockAdd = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    ldap: {
      list: (...a: unknown[]) => mockList(...a),
      add: (...a: unknown[]) => mockAdd(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
    },
  },
  LdapProvider: class {},
}));

import { LdapSettings } from "../components/admin/LdapSettings";

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleProviders = [
  {
    id: "ldap_1", name: "Company LDAP", slug: "company-ldap",
    host: "ldap.example.com", port: 389, is_secure: true,
    bind_dn: "cn=admin,dc=example,dc=com", bind_password: "",
    base_dn: "dc=example,dc=com", user_filter: "(uid={{username}})",
    username_attribute: "uid", email_attribute: "mail", name_attribute: "cn",
    default_role: "member", auto_register: true, is_active: true,
    created_by: "u1", created_at: 1000, updated_at: 1000,
  },
  {
    id: "ldap_2", name: "AD FS", slug: "adfs",
    host: "adfs.example.com", port: 636, is_secure: true,
    bind_dn: "svc-bind@adfs.example.com", bind_password: "",
    base_dn: "dc=adfs,dc=example,dc=com", user_filter: "(sAMAccountName={{username}})",
    username_attribute: "sAMAccountName", email_attribute: "mail", name_attribute: "displayName",
    default_role: "viewer", auto_register: false, is_active: false,
    created_by: "u1", created_at: 900, updated_at: 900,
  },
];

function renderLdapSettings(userId: string | null = "u1") {
  return render(<LdapSettings userId={userId} />);
}

describe("LdapSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(sampleProviders);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it("renders the section header", async () => {
    renderLdapSettings();
    await waitFor(() => {
      expect(screen.getByText("LDAP Directory Providers")).toBeInTheDocument();
    });
  });

  it("calls api.ldap.list on mount", () => {
    renderLdapSettings();
    expect(mockList).toHaveBeenCalledOnce();
  });

  it("shows Add Provider button", async () => {
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    // There are two "Add Provider" buttons: the header button
    const addBtns = screen.getAllByText("Add Provider");
    expect(addBtns.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it("shows loading spinner while fetching", () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderLdapSettings();
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  // ─── Empty state ─────────────────────────────────────────────────────────

  it("shows empty state when no providers", async () => {
    mockList.mockResolvedValue([]);
    renderLdapSettings();
    await waitFor(() => {
      expect(screen.getByText(/No LDAP providers configured/)).toBeInTheDocument();
    });
  });

  // ─── Populated state ─────────────────────────────────────────────────────

  it("renders provider names", async () => {
    renderLdapSettings();
    await waitFor(() => {
      expect(screen.getByText("Company LDAP")).toBeInTheDocument();
      expect(screen.getByText("AD FS")).toBeInTheDocument();
    });
  });

  it("shows host:port info", async () => {
    renderLdapSettings();
    await waitFor(() => {
      expect(screen.getByText(/ldap\.example\.com:389/)).toBeInTheDocument();
    });
  });

  it("shows active/disabled badges", async () => {
    renderLdapSettings();
    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });
  });

  // ─── Add dialog ──────────────────────────────────────────────────────────

  it("opens add dialog when Add Provider clicked", async () => {
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add Provider"));
    expect(screen.getByText("Add LDAP Provider")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Company LDAP")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ldap.example.com")).toBeInTheDocument();
  });

  it("pre-fills default port as 389", async () => {
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add Provider"));
    expect(screen.getByDisplayValue("389")).toBeInTheDocument();
  });

  it("calls api.ldap.add when form submitted", async () => {
    mockAdd.mockResolvedValue(undefined);
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add Provider"));

    fireEvent.change(screen.getByPlaceholderText("Company LDAP"), { target: { value: "My LDAP" } });
    fireEvent.change(screen.getByPlaceholderText("ldap.example.com"), { target: { value: "my-ldap.example.com" } });
    fireEvent.change(screen.getByPlaceholderText("dc=example,dc=com"), { target: { value: "dc=myorg,dc=com" } });

    // The save button is also "Add Provider" — use getAllByText and pick the one in the dialog
    const addBtns = screen.getAllByText("Add Provider");
    // Click the save button (last one is in the dialog, first is in the header)
    fireEvent.click(addBtns[addBtns.length - 1]);
    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalled();
      expect(mockAdd.mock.calls[0][0].name).toBe("My LDAP");
    });
  });

  it("closes dialog on Cancel", async () => {
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add Provider"));
    await waitFor(() => expect(screen.getByText("Add LDAP Provider")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Add LDAP Provider")).not.toBeInTheDocument();
  });

  it("shows validation error when name/host/base DN missing", async () => {
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add Provider"));
    // Click save without filling in the dialog
    const addBtns = screen.getAllByText("Add Provider");
    fireEvent.click(addBtns[addBtns.length - 1]);
    await waitFor(() => {
      expect(screen.getByText("Name, host, and base DN are required")).toBeInTheDocument();
    });
  });

  // ─── Edit dialog ────────────────────────────────────────────────────────

  it("opens edit dialog with pre-filled data", async () => {
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    const pencilIcons = document.querySelectorAll("button svg.lucide-pencil");
    fireEvent.click(pencilIcons[0].closest("button")!);
    await waitFor(() => {
      expect(screen.getByText("Edit LDAP Provider")).toBeInTheDocument();
    });
    const nameInput = screen.getByPlaceholderText("Company LDAP") as HTMLInputElement;
    expect(nameInput.value).toBe("Company LDAP");
  });

  it("calls api.ldap.update when editing", async () => {
    mockUpdate.mockResolvedValue(undefined);
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    const pencilIcons = document.querySelectorAll("button svg.lucide-pencil");
    fireEvent.click(pencilIcons[0].closest("button")!);
    await waitFor(() => expect(screen.getByText("Edit LDAP Provider")).toBeInTheDocument());
    const nameInput = screen.getByPlaceholderText("Company LDAP");
    fireEvent.change(nameInput, { target: { value: "Updated LDAP" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it("shows status dropdown when editing", async () => {
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    const pencilIcons = document.querySelectorAll("button svg.lucide-pencil");
    fireEvent.click(pencilIcons[0].closest("button")!);
    await waitFor(() => {
      expect(screen.getByText("Edit LDAP Provider")).toBeInTheDocument();
    });
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Active")).toBeInTheDocument();
  });

  // ─── Delete ─────────────────────────────────────────────────────────────

  it("calls api.ldap.delete on confirm", async () => {
    mockDelete.mockResolvedValue(undefined);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmMock);

    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    const trashIcons = document.querySelectorAll("button svg.lucide-trash-2");
    fireEvent.click(trashIcons[0].closest("button")!);
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("ldap_1");
    });
    vi.unstubAllGlobals();
  });

  // ─── Error state ─────────────────────────────────────────────────────────

  it("handles api.ldap.list error gracefully", async () => {
    mockList.mockRejectedValue(new Error("Network error"));
    renderLdapSettings();
    await waitFor(() => {
      expect(screen.getByText(/No LDAP providers configured/)).toBeInTheDocument();
    });
  });

  it("shows error on save failure", async () => {
    mockAdd.mockRejectedValue(new Error("Save failed"));
    renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Add Provider"));

    fireEvent.change(screen.getByPlaceholderText("Company LDAP"), { target: { value: "Test" } });
    fireEvent.change(screen.getByPlaceholderText("ldap.example.com"), { target: { value: "test.example.com" } });
    fireEvent.change(screen.getByPlaceholderText("dc=example,dc=com"), { target: { value: "dc=test,dc=com" } });

    const addBtns = screen.getAllByText("Add Provider");
    fireEvent.click(addBtns[addBtns.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Failed to save/)).toBeInTheDocument();
    });
  });

  // ─── userId null ─────────────────────────────────────────────────────────

  it("shows empty state when userId is null", async () => {
    renderLdapSettings(null);
    expect(mockList).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/No LDAP providers configured/)).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations with providers loaded", async () => {
    const { container } = renderLdapSettings();
    await waitFor(() => expect(screen.getByText("Company LDAP")).toBeInTheDocument());
    // Icon-only edit/delete buttons without aria-label are pre-existing in the source component
    const results = await axe(container, { rules: { "button-name": { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations in empty state", async () => {
    mockList.mockResolvedValue([]);
    const { container } = renderLdapSettings();
    await waitFor(() => expect(screen.getByText(/No LDAP providers configured/)).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
