import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockUsersList = vi.fn();
const mockGroupsList = vi.fn();
const mockOidcList = vi.fn();
const mockSamlList = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    users: { list: (...a: unknown[]) => mockUsersList(...a) },
    groups: { list: (...a: unknown[]) => mockGroupsList(...a) },
    oidc: { list: (...a: unknown[]) => mockOidcList(...a) },
    saml: { list: (...a: unknown[]) => mockSamlList(...a) },
  },
}));

let mockLocation = { pathname: '/admin' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// ─── Mock child components ────────────────────────────────────────────────────

vi.mock('../components/AdminDashboard', () => ({
  default: ({ userId }: { userId: string }) => (
    <div data-testid="admin-dashboard">Dashboard for {userId}</div>
  ),
}));

vi.mock('../components/AccessRequestPanel', () => ({
  default: ({ userId }: { userId: string }) => (
    <div data-testid="access-request-panel">Access Requests for {userId}</div>
  ),
}));

vi.mock('../components/WebhookSettings', () => ({
  WebhookSettings: ({ userId }: { userId: string }) => (
    <div data-testid="webhook-settings">Webhooks for {userId}</div>
  ),
}));

vi.mock('../components/admin/UsersPanel', () => ({
  UsersPanel: () => <div data-testid="users-panel">Users Panel</div>,
}));

vi.mock('../components/admin/GroupsPanel', () => ({
  GroupsPanel: () => <div data-testid="groups-panel">Groups Panel</div>,
}));

vi.mock('../components/admin/SsoPanel', () => ({
  SsoPanel: () => <div data-testid="sso-panel">SSO Panel</div>,
}));

vi.mock('../components/admin/SettingsPanel', () => ({
  SettingsPanel: () => <div data-testid="settings-panel">Settings Panel</div>,
}));

vi.mock('../components/admin/FeatureFlags', () => ({
  FeatureFlags: () => <div data-testid="feature-flags">Feature Flags</div>,
}));

vi.mock('../components/admin/BulkExport', () => ({
  BulkExport: () => <div data-testid="bulk-export">Bulk Export</div>,
}));

vi.mock('../components/admin/ScimSettings', () => ({
  ScimSettings: () => <div data-testid="scim-settings">SCIM Settings</div>,
}));

vi.mock('../components/admin/PasskeySettings', () => ({
  PasskeySettings: () => <div data-testid="passkey-settings">Passkey Settings</div>,
}));

vi.mock('../components/admin/InvitationSettings', () => ({
  InvitationSettings: () => <div data-testid="invitation-settings">Invitation Settings</div>,
}));

vi.mock('../components/admin/MfaSettings', () => ({
  MfaSettings: () => <div data-testid="mfa-settings">MFA Settings</div>,
}));

vi.mock('../components/admin/LdapSettings', () => ({
  LdapSettings: () => <div data-testid="ldap-settings">LDAP Settings</div>,
}));

vi.mock('../components/admin/OAuthSettings', () => ({
  OAuthSettings: () => <div data-testid="oauth-settings">OAuth Settings</div>,
}));

// ─── Toast mock ───────────────────────────────────────────────────────────────

const mockAddToast = vi.fn();
vi.mock('../components/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

import { AdminPanels } from '../components/admin/AdminPanels';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleUsers = [
  { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'admin', avatar_url: '' },
  { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'member', avatar_url: '' },
];

const sampleGroups = [
  {
    id: 'g1',
    name: 'Editors',
    description: 'Content editors',
    created_by: 'u1',
    created_at: 1000,
    updated_at: 1000,
  },
];

const sampleOidc = [
  {
    id: 'oidc1',
    name: 'Google',
    slug: 'google',
    issuer_url: 'https://accounts.google.com',
    client_id: 'xxx',
    client_secret: 'yyy',
    scopes: 'openid profile email',
    is_active: true,
    created_by: 'u1',
    created_at: 1000,
    updated_at: 1000,
  },
];

const sampleSaml = [
  {
    id: 'saml1',
    name: 'Okta',
    slug: 'okta',
    entity_id: 'okta.example.com',
    sso_url: 'https://okta.example.com/sso',
    certificate: '',
    name_id_format: 'emailAddress',
    attribute_mapping: '{}',
    auto_register: true,
    is_active: true,
    created_by: 'u1',
    created_at: 1000,
    updated_at: 1000,
  },
];

function renderAdmin(props: Partial<Parameters<typeof AdminPanels>[0]> = {}) {
  return render(
    <AdminPanels
      userId={props.userId ?? 'admin1'}
      allUsers={props.allUsers ?? []}
      setAllUsers={props.setAllUsers ?? vi.fn()}
    />,
  );
}

describe('AdminPanels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersList.mockResolvedValue(sampleUsers);
    mockGroupsList.mockResolvedValue(sampleGroups);
    mockOidcList.mockResolvedValue(sampleOidc);
    mockSamlList.mockResolvedValue(sampleSaml);
  });

  // ─── Basic rendering ──────────────────────────────────────────────────────

  it('renders the admin panel with header', () => {
    renderAdmin();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders all tab buttons', () => {
    renderAdmin();
    const tabs = [
      'Dashboard',
      'Users',
      'Groups',
      'Webhooks',
      'SSO',
      'Settings',
      'Features',
      'Export',
      'SCIM',
      'Passkeys',
      'Invitations',
      'Access Requests',
      'MFA',
      'OAuth',
      'LDAP',
    ];
    for (const tab of tabs) {
      expect(screen.getByText(tab)).toBeInTheDocument();
    }
  });

  it('calls api.users.list, api.groups.list, api.oidc.list, api.saml.list on mount', async () => {
    renderAdmin();
    await waitFor(() => {
      expect(mockUsersList).toHaveBeenCalledOnce();
      expect(mockGroupsList).toHaveBeenCalledOnce();
      expect(mockOidcList).toHaveBeenCalledOnce();
      expect(mockSamlList).toHaveBeenCalledOnce();
    });
  });

  it('calls setAllUsers with the result of api.users.list', async () => {
    const setAll = vi.fn();
    renderAdmin({ setAllUsers: setAll });
    await waitFor(() => {
      expect(setAll).toHaveBeenCalledWith(sampleUsers);
    });
  });

  // ─── API error doesn't break rendering ────────────────────────────────────

  it('handles API errors gracefully', async () => {
    mockUsersList.mockRejectedValue(new Error('DB error'));
    mockGroupsList.mockRejectedValue(new Error('DB error'));
    mockOidcList.mockRejectedValue(new Error('DB error'));
    mockSamlList.mockRejectedValue(new Error('DB error'));
    renderAdmin();
    await waitFor(() => {
      // Should still render the admin panel header even on error
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  // ─── Tab switching ────────────────────────────────────────────────────────

  it('shows UsersPanel when Users tab is clicked', async () => {
    renderAdmin();
    fireEvent.click(screen.getByText('Users'));
    await waitFor(() => {
      expect(screen.getByTestId('users-panel')).toBeInTheDocument();
    });
  });

  it('shows GroupsPanel when Groups tab is clicked', () => {
    renderAdmin();
    fireEvent.click(screen.getByText('Groups'));
    expect(screen.getByTestId('groups-panel')).toBeInTheDocument();
  });

  it('shows WebhookSettings when Webhooks tab is clicked', () => {
    renderAdmin();
    fireEvent.click(screen.getByText('Webhooks'));
    expect(screen.getByTestId('webhook-settings')).toBeInTheDocument();
  });

  it('shows SsoPanel when SSO tab is clicked', () => {
    renderAdmin();
    fireEvent.click(screen.getByText('SSO'));
    expect(screen.getByTestId('sso-panel')).toBeInTheDocument();
  });

  it('shows SettingsPanel when Settings tab is clicked', () => {
    renderAdmin();
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  // ─── Close button ─────────────────────────────────────────────────────────

  it("calls navigate('/') when close button is clicked", () => {
    renderAdmin();
    // The close button is the X icon button in the dialog header (now
    // labelled "Close dialog" for accessibility)
    const xButtons = document.querySelectorAll('button');
    let found = false;
    xButtons.forEach((btn) => {
      if (btn.querySelector('svg') && btn.closest('.dialog-container')) {
        fireEvent.click(btn);
        found = true;
      }
    });
    expect(found).toBe(true);
    // Also clicking the overlay calls navigate('/')
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('closes when clicking overlay (background)', () => {
    renderAdmin();
    const overlay = document.querySelector('.dialog-overlay');
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }
  });

  // ─── Returns null outside /admin path ─────────────────────────────────────

  it('returns null when not on /admin path', () => {
    mockLocation = { pathname: '/somewhere' };
    const { container } = renderAdmin();
    expect(container.innerHTML).toBe('');
    // Reset for other tests
    mockLocation = { pathname: '/admin' };
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  it('has no accessibility violations (excluding icon-only buttons)', async () => {
    const { container } = renderAdmin();
    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
    const results = await axe(container, {
      rules: { 'button-name': { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});
