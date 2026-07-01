import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";

// vi.mock factories are hoisted to top of file. Use vi.hoisted() to create
// shared objects that both the factory and test code can reference.
const __mockApi = vi.hoisted(() => ({
  oidc: { listActive: vi.fn() },
  saml: { listActive: vi.fn() },
  ldap: { listActive: vi.fn() },
  oauth: { listProviders: vi.fn() },
  users: { register: vi.fn(), login: vi.fn() },
  mfa: { isEnabled: vi.fn(), verifyTotp: vi.fn(), verifyBackupCode: vi.fn() },
}));

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../lib/helpers", () => ({
  callReducerLocal: vi.fn(),
  arrayBufferToBase64Url: vi.fn(() => "mocked-base64-url"),
}));

vi.mock("../../lib/api", () => ({
  api: __mockApi,
}));

// Helpers to find inputs reliably — the labels are plain <label> siblings
// (not wrapping and no htmlFor), so getByLabelText won't work.
function getEmailInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="email"]')!;
}
function getPasswordInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="password"]')!;
}
function getNameInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="text"]')!;
}

// Mock crypto for OIDC/OAuth flows
const mockGetRandomValues = vi.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) arr[i] = i;
  return arr;
});
const mockDigest = vi.fn().mockResolvedValue(new ArrayBuffer(32));
const mockSubtle = { digest: mockDigest };
const mockRandomUUID = vi.fn(() => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

// Store reference for localStorage spy cleanup
let store: Record<string, string> = {};

function setupMocks() {
  Object.assign(globalThis.crypto, { getRandomValues: mockGetRandomValues, randomUUID: mockRandomUUID });
  Object.defineProperty(globalThis.crypto, "subtle", {
    value: mockSubtle,
    writable: true,
    configurable: true,
  });

  // Mock navigator.credentials
  Object.defineProperty(globalThis.navigator, "credentials", {
    value: { get: vi.fn() },
    writable: true,
    configurable: true,
  });

  store = {};
  vi.spyOn(Storage.prototype, "getItem").mockImplementation((key: string) => store[key] ?? null);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string, value: string) => { store[key] = value; });
}

import LoginView from "../../pages/LoginView";

describe("LoginView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    __mockApi.oidc.listActive.mockResolvedValue([]);
    __mockApi.saml.listActive.mockResolvedValue([]);
    __mockApi.ldap.listActive.mockResolvedValue([]);
    __mockApi.oauth.listProviders.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Render States ──

  it("renders sign-in form by default", () => {
    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    expect(screen.getAllByText("Sign in")).toHaveLength(2); // h1 + button
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByText("Welcome back.")).toBeTruthy();
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByText("Password")).toBeTruthy();
    expect(getEmailInput(container)).toBeTruthy();
    expect(getPasswordInput(container)).toBeTruthy();
    expect(screen.getByText("Don't have an account?")).toBeTruthy();
    expect(screen.getByText("Register")).toBeTruthy();
  });

  it("toggles to register mode", async () => {
    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.click(screen.getByText("Register"));
    expect(screen.getAllByText("Create account")).toHaveLength(2); // h1 + button
    expect(screen.getByRole("heading", { name: "Create account" })).toBeTruthy();
    expect(screen.getByText("Join your team's knowledge base.")).toBeTruthy();
    expect(getNameInput(container)).toBeTruthy();
    expect(screen.getByText("Already have an account?")).toBeTruthy();
  });

  it("toggles back to sign-in mode", async () => {
    render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.click(screen.getByText("Register"));
    await userEvent.click(screen.getByText("Sign in"));
    expect(screen.getAllByText("Sign in")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    expect(screen.getByText("Welcome back.")).toBeTruthy();
  });

  it("renders OIDC provider buttons when available", async () => {
    __mockApi.oidc.listActive.mockResolvedValue([
      { id: "oidc-1", name: "GitHub", issuer_url: "https://github.com", client_id: "abc", scopes: "openid email" },
      { id: "oidc-2", name: "Azure AD", issuer_url: "https://login.microsoftonline.com", client_id: "def", scopes: "openid" },
    ]);

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText("Sign in with GitHub")).toBeTruthy();
      expect(screen.getByText("Sign in with Azure AD")).toBeTruthy();
    });
  });

  it("renders SAML provider buttons when available", async () => {
    __mockApi.saml.listActive.mockResolvedValue([
      { id: "saml-1", name: "Okta", sso_url: "https://okta.example.com/sso", name_id_format: "emailAddress", auto_register: true },
    ]);

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText("Sign in with Okta (SAML)")).toBeTruthy();
    });
  });

  it("renders OAuth provider buttons when available", async () => {
    __mockApi.oauth.listProviders.mockResolvedValue([
      { id: "oauth-1", name: "GitLab", authorize_url: "https://gitlab.com/oauth/authorize", client_id: "ghi", scope: "read_user" },
    ]);

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText("Sign in with GitLab")).toBeTruthy();
    });
  });

  it("renders LDAP provider section when available", async () => {
    __mockApi.ldap.listActive.mockResolvedValue([
      { id: "ldap-1", name: "Corporate AD" },
    ]);

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText("Sign in with LDAP (Corporate AD)")).toBeTruthy();
    });
  });

  it("renders Google and Passkey sign-in buttons always", () => {
    render(<BrowserRouter><LoginView /></BrowserRouter>);
    expect(screen.getByText("Sign in with Google")).toBeTruthy();
    expect(screen.getByText("Sign in with Passkey")).toBeTruthy();
  });

  // ── SSO Provider Error Handling ──

  it("handles OIDC provider fetch failure gracefully", async () => {
    __mockApi.oidc.listActive.mockRejectedValue(new Error("Network error"));

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    });
  });

  it("handles OAuth provider fetch failure gracefully", async () => {
    __mockApi.oauth.listProviders.mockRejectedValue(new Error("Network error"));

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    });
  });

  it("handles SAML provider fetch failure gracefully", async () => {
    __mockApi.saml.listActive.mockRejectedValue(new Error("Network error"));

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    });
  });

  it("handles LDAP provider fetch failure gracefully", async () => {
    __mockApi.ldap.listActive.mockRejectedValue(new Error("Network error"));

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    });
  });

  // ── Email/Password Login Flow ──

  it("logs in with email and password successfully", async () => {
    __mockApi.users.login.mockResolvedValue({ id: "user-123" });
    __mockApi.mfa.isEnabled.mockResolvedValue(false);

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.type(getEmailInput(container), "test@example.com");
    await userEvent.type(getPasswordInput(container), "mypassword");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(__mockApi.users.login).toHaveBeenCalledWith("test@example.com", "mypassword");
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
    expect(localStorage.setItem).toHaveBeenCalledWith("sw_user_id", "user-123");
  });

  it("registers and then logs in successfully", async () => {
    __mockApi.users.register.mockResolvedValue({});
    __mockApi.users.login.mockResolvedValue({ id: "user-456" });
    __mockApi.mfa.isEnabled.mockResolvedValue(false);

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.click(screen.getByText("Register"));
    await userEvent.type(getNameInput(container), "Test User");
    await userEvent.type(getEmailInput(container), "newuser@example.com");
    await userEvent.type(getPasswordInput(container), "newpassword");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(__mockApi.users.register).toHaveBeenCalledWith("Test User", "newuser@example.com", "newpassword", "member");
    });
    await waitFor(() => {
      expect(__mockApi.users.login).toHaveBeenCalledWith("newuser@example.com", "newpassword");
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error on login failure", async () => {
    __mockApi.users.login.mockRejectedValue(new Error("Invalid credentials"));

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.type(getEmailInput(container), "bad@example.com");
    await userEvent.type(getPasswordInput(container), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Error: Invalid credentials")).toBeTruthy();
    });
  });

  it("shows error on register failure", async () => {
    __mockApi.users.register.mockRejectedValue(new Error("Email already exists"));

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.click(screen.getByText("Register"));
    await userEvent.type(getNameInput(container), "Test User");
    await userEvent.type(getEmailInput(container), "existing@example.com");
    await userEvent.type(getPasswordInput(container), "password");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Error: Email already exists")).toBeTruthy();
    });
  });

  it("handles login returning no user", async () => {
    __mockApi.users.login.mockResolvedValue(null);
    __mockApi.mfa.isEnabled.mockRejectedValue(new Error("MFA check failed"));

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.type(getEmailInput(container), "test@example.com");
    await userEvent.type(getPasswordInput(container), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeTruthy();
    });
  });

  // ── MFA Flow ──

  it("shows MFA verification when login has MFA enabled", async () => {
    __mockApi.users.login.mockResolvedValue({ id: "user-mfa" });
    __mockApi.mfa.isEnabled.mockResolvedValue(true);
    __mockApi.mfa.verifyTotp.mockResolvedValue({});

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.type(getEmailInput(container), "mfa@example.com");
    await userEvent.type(getPasswordInput(container), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeTruthy();
    });

    const mfaInput: HTMLInputElement = container.querySelector('input[maxLength="6"]')!;
    await userEvent.type(mfaInput, "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(__mockApi.mfa.verifyTotp).toHaveBeenCalledWith("user-mfa", 123456);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error for invalid MFA code format", async () => {
    __mockApi.users.login.mockResolvedValue({ id: "user-mfa" });
    __mockApi.mfa.isEnabled.mockResolvedValue(true);

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.type(getEmailInput(container), "mfa@example.com");
    await userEvent.type(getPasswordInput(container), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeTruthy();
    });

    const mfaInput: HTMLInputElement = container.querySelector('input[maxLength="6"]')!;
    await userEvent.type(mfaInput, "12");
    const verifyBtn = screen.getByRole("button", { name: "Verify" });
    expect(verifyBtn.hasAttribute("disabled")).toBe(true);
  });

  it("shows MFA error on verification failure", async () => {
    __mockApi.users.login.mockResolvedValue({ id: "user-mfa" });
    __mockApi.mfa.isEnabled.mockResolvedValue(true);
    __mockApi.mfa.verifyTotp.mockRejectedValue(new Error("Invalid code"));

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.type(getEmailInput(container), "mfa@example.com");
    await userEvent.type(getPasswordInput(container), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeTruthy();
    });

    const mfaInput: HTMLInputElement = container.querySelector('input[maxLength="6"]')!;
    await userEvent.type(mfaInput, "987654");

    const verifyBtn = screen.getByRole("button", { name: "Verify" });
    await waitFor(() => {
      expect(verifyBtn.hasAttribute("disabled")).toBe(false);
    });

    await userEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid code")).toBeTruthy();
    });
  });

  it("switches to MFA backup code mode and verifies", async () => {
    __mockApi.users.login.mockResolvedValue({ id: "user-mfa" });
    __mockApi.mfa.isEnabled.mockResolvedValue(true);
    __mockApi.mfa.verifyBackupCode.mockResolvedValue({});

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.type(getEmailInput(container), "mfa@example.com");
    await userEvent.type(getPasswordInput(container), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeTruthy();
    });

    await userEvent.click(screen.getByText("Use a backup code instead"));
    expect(screen.getByText("Backup Code")).toBeTruthy();
    const backupInput: HTMLInputElement = container.querySelector('input[placeholder="XXXX XXXX"]')!;
    expect(backupInput).toBeTruthy();

    await userEvent.type(backupInput, "ABCD1234");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(__mockApi.mfa.verifyBackupCode).toHaveBeenCalledWith("user-mfa", "ABCD1234");
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("switches back from backup code to authenticator mode", async () => {
    __mockApi.users.login.mockResolvedValue({ id: "user-mfa" });
    __mockApi.mfa.isEnabled.mockResolvedValue(true);

    const { container } = render(<BrowserRouter><LoginView /></BrowserRouter>);

    await userEvent.type(getEmailInput(container), "mfa@example.com");
    await userEvent.type(getPasswordInput(container), "password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeTruthy();
    });

    await userEvent.click(screen.getByText("Use a backup code instead"));
    expect(container.querySelector('input[placeholder="XXXX XXXX"]')).toBeTruthy();

    await userEvent.click(screen.getByText("Use authenticator app instead"));
    expect(container.querySelector('input[maxLength="6"]')).toBeTruthy();
  });

  // ── Google Sign-In ──

  it("shows error when Google OAuth not configured", async () => {
    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await userEvent.click(screen.getByText("Sign in with Google"));

    expect(screen.getByText("Google OAuth not configured.")).toBeTruthy();
  });

  // ── Passkey Sign-In ──

  it("shows error on passkey sign-in failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Passkey not available"));

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await userEvent.click(screen.getByText("Sign in with Passkey"));

    await waitFor(() => {
      expect(screen.getByText(/Passkey sign-in failed/)).toBeTruthy();
    });
  });

  // ── LDAP Sign-In ──

  it("shows error when LDAP credentials are empty", async () => {
    __mockApi.ldap.listActive.mockResolvedValue([
      { id: "ldap-1", name: "Corporate AD" },
    ]);

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText("Sign in with LDAP (Corporate AD)")).toBeTruthy();
    });

    await userEvent.click(screen.getByText("Sign in with LDAP"));
    expect(screen.getByText("LDAP username and password required")).toBeTruthy();
  });

  // ── OIDC OAuth Flow ──

  it("triggers OIDC sign-in flow on click", async () => {
    __mockApi.oidc.listActive.mockResolvedValue([
      { id: "oidc-github", name: "GitHub", issuer_url: "https://github.com", client_id: "abc123", scopes: "openid email" },
    ]);
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ authorization_endpoint: "https://github.com/login/oauth/authorize" }),
    });

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText("Sign in with GitHub")).toBeTruthy();
    });

    await userEvent.click(screen.getByText("Sign in with GitHub"));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("https://github.com/.well-known/openid-configuration");
    });
  });

  it("shows error when OIDC discovery fails", async () => {
    __mockApi.oidc.listActive.mockResolvedValue([
      { id: "oidc-bad", name: "BadIdP", issuer_url: "https://badidp.example.com", client_id: "xyz", scopes: "openid" },
    ]);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

    render(<BrowserRouter><LoginView /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText("Sign in with BadIdP")).toBeTruthy();
    });

    await userEvent.click(screen.getByText("Sign in with BadIdP"));

    await waitFor(() => {
      expect(screen.getByText("Could not discover OIDC endpoints.")).toBeTruthy();
    });
  });

  // ── Empty State ──

  it("renders without SSO buttons when no providers configured", () => {
    render(<BrowserRouter><LoginView /></BrowserRouter>);

    expect(screen.getByText("Sign in with Google")).toBeTruthy();
    expect(screen.getByText("Sign in with Passkey")).toBeTruthy();
    expect(screen.queryByText(/Sign in with .*\(SAML\)/)).toBeNull();
  });
});
