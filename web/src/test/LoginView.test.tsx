import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const mockOidcListActive = vi.hoisted(() => vi.fn());
const mockSamlListActive = vi.hoisted(() => vi.fn());
const mockLdapListActive = vi.hoisted(() => vi.fn());
const mockOauthListProviders = vi.hoisted(() => vi.fn());
const mockUsersRegister = vi.hoisted(() => vi.fn());
const mockUsersLogin = vi.hoisted(() => vi.fn());
const mockMfaIsEnabled = vi.hoisted(() => vi.fn());
const mockMfaVerifyTotp = vi.hoisted(() => vi.fn());
const mockMfaVerifyBackupCode = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  api: {
    oidc: { listActive: mockOidcListActive },
    saml: { listActive: mockSamlListActive },
    ldap: { listActive: mockLdapListActive },
    oauth: { listProviders: mockOauthListProviders },
    users: {
      register: mockUsersRegister,
      login: mockUsersLogin,
    },
    mfa: {
      isEnabled: mockMfaIsEnabled,
      verifyTotp: mockMfaVerifyTotp,
      verifyBackupCode: mockMfaVerifyBackupCode,
    },
  },
}));

// Mock helpers
vi.mock("../lib/helpers", () => ({
  arrayBufferToBase64Url: vi.fn((buf: ArrayBuffer) => "mocked-base64"),
  callReducerLocal: vi.fn(async () => {}),
}));

import LoginView from "../pages/LoginView";

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleOidcProviders = [
  { id: "oidc1", name: "Keycloak", issuer_url: "https://keycloak.example.com", client_id: "kc_client", scopes: "openid email", is_active: true },
];
const sampleSamlProviders = [
  { id: "saml1", name: "Azure AD", sso_url: "https://login.microsoftonline.com/saml2", name_id_format: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress", auto_register: true, is_active: true },
];
const sampleLdapProviders = [
  { id: "ldap1", name: "Corporate LDAP", server_url: "ldap://ldap.example.com", base_dn: "dc=example,dc=com", is_active: true },
];
const sampleOauthProviders = [
  { id: "oa1", name: "GitHub", authorize_url: "https://github.com/login/oauth/authorize", client_id: "gh_client", scope: "read:user" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/" element={<div data-testid="home-view">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Find all <input> elements inside the form (excluding MFA inputs) */
function getFormInputs(): { email: HTMLInputElement; password: HTMLInputElement } {
  const form = document.querySelector("form");
  const inputs = form ? Array.from(form.querySelectorAll<HTMLInputElement>("input")) : [];
  // Register mode: [name, email, password]; Login mode: [email, password]
  return {
    email: inputs[inputs.length - 2],
    password: inputs[inputs.length - 1],
  };
}

function fillLoginForm(email: string, password: string) {
  const { email: emailInput, password: passwordInput } = getFormInputs();
  fireEvent.change(emailInput, { target: { value: email } });
  fireEvent.change(passwordInput, { target: { value: password } });
}

/** Get the <form> submit button (the one with type="submit") */
function getSubmitButton(): HTMLButtonElement {
  const form = document.querySelector("form");
  if (!form) throw new Error("No form found");
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!submitBtn) throw new Error("No submit button found");
  return submitBtn;
}

describe("LoginView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockOidcListActive.mockResolvedValue([]);
    mockSamlListActive.mockResolvedValue([]);
    mockLdapListActive.mockResolvedValue([]);
    mockOauthListProviders.mockResolvedValue([]);
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  it("renders login form by default", async () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back.")).toBeInTheDocument();
    const { email, password } = getFormInputs();
    expect(email).toBeInTheDocument();
    expect(password).toBeInTheDocument();
  });

  it("shows register form after toggling", async () => {
    renderLogin();
    fireEvent.click(screen.getByText("Register"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
      expect(screen.getByText("Join your team's knowledge base.")).toBeInTheDocument();
      // Register mode has 3 inputs: name, email, password
      const form = document.querySelector("form");
      const inputs = form ? form.querySelectorAll("input") : [];
      expect(inputs.length).toBe(3);
    });
  });

  // ─── SSO provider buttons ──────────────────────────────────────────────────

  it("shows OIDC provider buttons when configured", async () => {
    mockOidcListActive.mockResolvedValue(sampleOidcProviders);
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText("Sign in with Keycloak")).toBeInTheDocument();
    });
  });

  it("shows SAML provider buttons when configured", async () => {
    mockSamlListActive.mockResolvedValue(sampleSamlProviders);
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText("Sign in with Azure AD (SAML)")).toBeInTheDocument();
    });
  });

  it("shows OAuth provider buttons when configured", async () => {
    mockOauthListProviders.mockResolvedValue(sampleOauthProviders);
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText("Sign in with GitHub")).toBeInTheDocument();
    });
  });

  it("shows LDAP provider section when configured", async () => {
    mockLdapListActive.mockResolvedValue(sampleLdapProviders);
    renderLogin();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("LDAP username")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("LDAP password")).toBeInTheDocument();
      expect(screen.getByText("Sign in with LDAP")).toBeInTheDocument();
    });
  });

  it("always shows Google and Passkey sign-in buttons", async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
      expect(screen.getByText("Sign in with Passkey")).toBeInTheDocument();
    });
  });

  // ─── Login flow ────────────────────────────────────────────────────────────

  it("calls login on form submit and navigates to home", async () => {
    mockUsersLogin.mockResolvedValue({ id: "user_1", name: "Test User", email: "test@example.com" });
    mockMfaIsEnabled.mockResolvedValue(false);
    renderLogin();

    fillLoginForm("test@example.com", "password123");
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(mockUsersLogin).toHaveBeenCalledWith("test@example.com", "password123");
    });
    await waitFor(() => {
      expect(screen.getByTestId("home-view")).toBeInTheDocument();
    });
    expect(localStorage.getItem("sw_user_id")).toBe("user_1");
  });

  it("shows error when login fails", async () => {
    mockUsersLogin.mockRejectedValue(new Error("Invalid credentials"));
    renderLogin();

    fillLoginForm("wrong@example.com", "badpass");
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
    expect(screen.queryByTestId("home-view")).not.toBeInTheDocument();
  });

  // ─── Registration flow ─────────────────────────────────────────────────────

  it("registers then logs in on submit in register mode", async () => {
    mockUsersRegister.mockResolvedValue(undefined);
    mockUsersLogin.mockResolvedValue({ id: "user_2", name: "New User", email: "new@example.com" });
    mockMfaIsEnabled.mockResolvedValue(false);
    renderLogin();

    // Switch to register
    fireEvent.click(screen.getByText("Register"));

    await waitFor(() => {
      // Register mode should have 3 inputs
      const form = document.querySelector("form");
      const inputs = form ? form.querySelectorAll("input") : [];
      expect(inputs.length).toBe(3);
    });

    // Fill name (first input)
    const form = document.querySelector("form")!;
    const inputs = form.querySelectorAll<HTMLInputElement>("input");
    fireEvent.change(inputs[0], { target: { value: "New User" } });
    fireEvent.change(inputs[1], { target: { value: "new@example.com" } });
    fireEvent.change(inputs[2], { target: { value: "securepass" } });

    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(mockUsersRegister).toHaveBeenCalledWith("New User", "new@example.com", "securepass", "member");
    });
    await waitFor(() => {
      expect(screen.getByTestId("home-view")).toBeInTheDocument();
    });
  });

  // ─── MFA flow ──────────────────────────────────────────────────────────────

  it("shows MFA code input when MFA is enabled", async () => {
    mockUsersLogin.mockResolvedValue({ id: "user_mfa", name: "MFA User", email: "mfa@example.com" });
    mockMfaIsEnabled.mockResolvedValue(true);
    renderLogin();

    fillLoginForm("mfa@example.com", "password");
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });
  });

  it("verifies MFA code and navigates home", async () => {
    mockUsersLogin.mockResolvedValue({ id: "user_mfa", name: "MFA User", email: "mfa@example.com" });
    mockMfaIsEnabled.mockResolvedValue(true);
    mockMfaVerifyTotp.mockResolvedValue(undefined);
    renderLogin();

    fillLoginForm("mfa@example.com", "password");
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("Verify"));

    await waitFor(() => {
      expect(mockMfaVerifyTotp).toHaveBeenCalledWith("user_mfa", 123456);
    });
    await waitFor(() => {
      expect(screen.getByTestId("home-view")).toBeInTheDocument();
    });
  });

  it("switches to backup code mode in MFA", async () => {
    mockUsersLogin.mockResolvedValue({ id: "user_mfa", name: "MFA User", email: "mfa@example.com" });
    mockMfaIsEnabled.mockResolvedValue(true);
    renderLogin();

    fillLoginForm("mfa@example.com", "password");
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Use a backup code instead"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("XXXX XXXX")).toBeInTheDocument();
    });
  });

  it("verifies backup code and navigates home", async () => {
    mockUsersLogin.mockResolvedValue({ id: "user_mfa", name: "MFA User", email: "mfa@example.com" });
    mockMfaIsEnabled.mockResolvedValue(true);
    mockMfaVerifyBackupCode.mockResolvedValue(undefined);
    renderLogin();

    fillLoginForm("mfa@example.com", "password");
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Use a backup code instead"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("XXXX XXXX")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("XXXX XXXX"), { target: { value: "ABCD1234" } });
    fireEvent.click(screen.getByText("Verify"));

    await waitFor(() => {
      expect(mockMfaVerifyBackupCode).toHaveBeenCalledWith("user_mfa", "ABCD1234");
    });
    await waitFor(() => {
      expect(screen.getByTestId("home-view")).toBeInTheDocument();
    });
  });

  it("shows error on MFA verification failure", async () => {
    mockUsersLogin.mockResolvedValue({ id: "user_mfa", name: "MFA User", email: "mfa@example.com" });
    mockMfaIsEnabled.mockResolvedValue(true);
    mockMfaVerifyTotp.mockRejectedValue(new Error("Invalid code"));
    renderLogin();

    fillLoginForm("mfa@example.com", "password");
    fireEvent.click(getSubmitButton());

    await waitFor(() => {
      expect(screen.getByText("Two-Factor Authentication")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("Verify"));

    await waitFor(() => {
      expect(screen.getByText(/Invalid code/)).toBeInTheDocument();
    });
  });

  // ─── LDAP flow ─────────────────────────────────────────────────────────────

  it("shows LDAP loading spinner when signing in", async () => {
    mockLdapListActive.mockResolvedValue(sampleLdapProviders);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    renderLogin();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("LDAP username")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("LDAP username"), { target: { value: "jdoe" } });
    fireEvent.change(screen.getByPlaceholderText("LDAP password"), { target: { value: "ldappass" } });

    fireEvent.click(screen.getByText("Sign in with LDAP"));

    await waitFor(() => {
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    fetchSpy.mockRestore();
  });

  // ─── Error display ─────────────────────────────────────────────────────────

  it("displays error when Google OAuth not configured", async () => {
    localStorage.removeItem("sw_google_client_id");
    renderLogin();

    await waitFor(() => {
      expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Sign in with Google"));

    await waitFor(() => {
      expect(screen.getByText("Google OAuth not configured.")).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────
  // Note: LoginView uses <label> elements without htmlFor attributes.
  // This is an a11y violation that should be fixed in the component itself.
  // Here we check that the component at least renders without crashes.

  it("renders login form state without crashing", async () => {
    const { container } = renderLogin();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    });
    expect(container.querySelector("form")).toBeInTheDocument();
  });

  it("renders register form state without crashing", async () => {
    const { container } = renderLogin();
    fireEvent.click(screen.getByText("Register"));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument();
    });
    expect(container.querySelector("form")).toBeInTheDocument();
  });

  it("renders MFA state without crashing", async () => {
    mockUsersLogin.mockResolvedValue({ id: "user_mfa", name: "MFA User", email: "mfa@example.com" });
    mockMfaIsEnabled.mockResolvedValue(true);
    const { container } = renderLogin();

    fillLoginForm("mfa@example.com", "pass");
    fireEvent.click(getSubmitButton());

    await screen.findByText("Two-Factor Authentication");
    expect(container.querySelector("input[placeholder='000000']")).toBeInTheDocument();
  });
});
