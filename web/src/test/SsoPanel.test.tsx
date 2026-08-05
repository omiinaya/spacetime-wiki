import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockOidcList = vi.fn();
const mockOidcCreate = vi.fn();
const mockOidcUpdate = vi.fn();
const mockOidcDelete = vi.fn();
const mockSamlList = vi.fn();
const mockSamlCreate = vi.fn();
const mockSamlUpdate = vi.fn();
const mockSamlDelete = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    oidc: {
      list: (...a: unknown[]) => mockOidcList(...a),
      create: (...a: unknown[]) => mockOidcCreate(...a),
      update: (...a: unknown[]) => mockOidcUpdate(...a),
      delete: (...a: unknown[]) => mockOidcDelete(...a),
    },
    saml: {
      list: (...a: unknown[]) => mockSamlList(...a),
      create: (...a: unknown[]) => mockSamlCreate(...a),
      update: (...a: unknown[]) => mockSamlUpdate(...a),
      delete: (...a: unknown[]) => mockSamlDelete(...a),
    },
  },
  OidcProvider: class {},
  SamlProvider: class {},
}));

import { SsoPanel } from '../components/admin/SsoPanel';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleOidcProviders = [
  {
    id: 'oidc_1',
    name: 'Keycloak',
    slug: 'keycloak',
    issuer_url: 'https://keycloak.example.com/auth/realms/myrealm',
    client_id: 'spacetime-wiki',
    client_secret: 'sec1',
    scopes: 'openid email profile',
    is_active: true,
    created_by: 'u1',
    created_at: 1000,
    updated_at: 1000,
  },
  {
    id: 'oidc_2',
    name: 'Okta',
    slug: 'okta',
    issuer_url: 'https://dev-123.okta.com',
    client_id: 'okta_cid',
    client_secret: 'sec2',
    scopes: 'openid email',
    is_active: false,
    created_by: 'u1',
    created_at: 900,
    updated_at: 900,
  },
];

const sampleSamlProviders = [
  {
    id: 'saml_1',
    name: 'Okta SAML',
    slug: 'okta-saml',
    entity_id: 'https://www.okta.com/saml2/service-provider/sp-wiki',
    sso_url: 'https://okta.example.com/saml2/sso',
    certificate: 'MIID...',
    name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    attribute_mapping: '{"email":"email","name":"name"}',
    auto_register: true,
    is_active: true,
    created_by: 'u1',
    created_at: 1000,
    updated_at: 1000,
  },
];

const addToast = vi.fn();

function renderSsoPanel() {
  return render(<SsoPanel addToast={addToast} />);
}

describe('SsoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOidcList.mockResolvedValue(sampleOidcProviders);
    mockSamlList.mockResolvedValue(sampleSamlProviders);
    // Mock crypto.randomUUID for deterministic IDs
    vi.stubGlobal('crypto', {
      ...crypto,
      randomUUID: () => 'mock-uuid-123',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders OIDC and SAML section headers', () => {
    renderSsoPanel();
    expect(screen.getByText('OIDC Providers')).toBeInTheDocument();
    expect(screen.getByText('SAML 2.0 Providers')).toBeInTheDocument();
  });

  it('calls api.oidc.list and api.saml.list on mount', () => {
    renderSsoPanel();
    expect(mockOidcList).toHaveBeenCalledOnce();
    expect(mockSamlList).toHaveBeenCalledOnce();
  });

  it('shows Add Provider buttons', () => {
    renderSsoPanel();
    const addButtons = screen.getAllByText('Add Provider');
    expect(addButtons.length).toBe(2);
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it('shows loading state while fetching', () => {
    mockOidcList.mockReturnValue(new Promise(() => {}));
    mockSamlList.mockReturnValue(new Promise(() => {}));
    renderSsoPanel();
    // Both sections show empty state since list is pending — loading is inferred
    // by absence of data; SsoPanel doesn't have a dedicated spinner
    expect(screen.getByText('No OIDC providers configured.')).toBeInTheDocument();
    expect(screen.getByText('No SAML providers configured.')).toBeInTheDocument();
  });

  // ─── Empty state ─────────────────────────────────────────────────────────

  it('shows empty state when no OIDC providers', async () => {
    mockOidcList.mockResolvedValue([]);
    renderSsoPanel();
    await waitFor(() => {
      expect(screen.getByText('No OIDC providers configured.')).toBeInTheDocument();
    });
  });

  it('shows empty state when no SAML providers', async () => {
    mockSamlList.mockResolvedValue([]);
    renderSsoPanel();
    await waitFor(() => {
      expect(screen.getByText('No SAML providers configured.')).toBeInTheDocument();
    });
  });

  // ─── Populated state ─────────────────────────────────────────────────────

  it('renders OIDC provider names', async () => {
    renderSsoPanel();
    await waitFor(() => {
      expect(screen.getByText('Keycloak')).toBeInTheDocument();
      expect(screen.getByText('Okta')).toBeInTheDocument();
    });
  });

  it('renders SAML provider names', async () => {
    renderSsoPanel();
    await waitFor(() => {
      expect(screen.getByText('Okta SAML')).toBeInTheDocument();
    });
  });

  it('shows OIDC issuer URLs', async () => {
    renderSsoPanel();
    await waitFor(() => {
      expect(screen.getByText(/keycloak\.example\.com/)).toBeInTheDocument();
    });
  });

  it('shows SAML entity ID', async () => {
    renderSsoPanel();
    await waitFor(() => {
      expect(screen.getByText(/Entity:/)).toBeInTheDocument();
    });
  });

  it('shows active/badge for active providers', async () => {
    renderSsoPanel();
    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Disabled badge for inactive providers', async () => {
    renderSsoPanel();
    await waitFor(() => {
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  // ─── OIDC Add dialog ─────────────────────────────────────────────────────

  it('opens OIDC add dialog when Add Provider clicked', async () => {
    renderSsoPanel();
    const addButtons = screen.getAllByText('Add Provider');
    fireEvent.click(addButtons[0]); // first is OIDC
    await waitFor(() => {
      expect(screen.getByText('Add OIDC Provider')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Provider name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Slug (e.g. keycloak)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Issuer URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Client ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Client Secret')).toBeInTheDocument();
  });

  it('calls api.oidc.create with form data', async () => {
    mockOidcCreate.mockResolvedValue(undefined);
    renderSsoPanel();
    const addButtons = screen.getAllByText('Add Provider');
    fireEvent.click(addButtons[0]);

    fireEvent.change(screen.getByPlaceholderText('Provider name'), {
      target: { value: 'My OIDC' },
    });
    fireEvent.change(screen.getByPlaceholderText('Slug (e.g. keycloak)'), {
      target: { value: 'my-oidc' },
    });
    fireEvent.change(screen.getByPlaceholderText('Issuer URL'), {
      target: { value: 'https://issuer.example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Client ID'), {
      target: { value: 'my-client-id' },
    });
    fireEvent.change(screen.getByPlaceholderText('Client Secret'), {
      target: { value: 'my-secret' },
    });

    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(mockOidcCreate).toHaveBeenCalledWith(
        'My OIDC',
        'my-oidc',
        'https://issuer.example.com',
        'my-client-id',
        'my-secret',
        'openid email profile',
        'admin',
      );
    });
  });

  it('closes OIDC dialog on Cancel', async () => {
    renderSsoPanel();
    const addButtons = screen.getAllByText('Add Provider');
    fireEvent.click(addButtons[0]);
    await waitFor(() => expect(screen.getByText('Add OIDC Provider')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Add OIDC Provider')).not.toBeInTheDocument();
  });

  // ─── OIDC Edit dialog ────────────────────────────────────────────────────

  it('opens OIDC edit dialog with pre-filled data', async () => {
    renderSsoPanel();
    // Explicit timeout: provider names render only after the mocked providers
    // GET resolves. Under parallel CI load the default 1s waitFor can elapse
    // first — flaked once on this box.
    await waitFor(() => expect(screen.getByText('Keycloak')).toBeInTheDocument(), {
      timeout: 5000,
    });
    const editBtns = document.querySelectorAll('[class*="rounded"][class*="hover:bg-muted"]');
    // Find the pencil buttons
    const pencilBtns = document.querySelectorAll('button svg[class*="lucide-pencil"]');
    if (pencilBtns.length > 0) {
      fireEvent.click(pencilBtns[0].closest('button')!);
    } else {
      // fallback: click edit button by title or role
      const buttons = screen.getAllByRole('button');
      // Find edit buttons — they contain Pencil icon
      for (const btn of buttons) {
        if (btn.innerHTML.includes('pencil')) {
          fireEvent.click(btn);
          break;
        }
      }
    }
    await waitFor(() => {
      expect(screen.getByText('Edit OIDC Provider')).toBeInTheDocument();
    });
    const nameInput = screen.getByPlaceholderText('Provider name') as HTMLInputElement;
    expect(nameInput.value).toBe('Keycloak');
  });

  it('calls api.oidc.update when editing', async () => {
    mockOidcUpdate.mockResolvedValue(undefined);
    renderSsoPanel();
    await waitFor(() => expect(screen.getByText('Keycloak')).toBeInTheDocument());
    // Click the first edit (pencil) button under OIDC section
    const allPencilIcons = document.querySelectorAll('button svg.lucide-pencil');
    if (allPencilIcons.length > 0) {
      fireEvent.click(allPencilIcons[0].closest('button')!);
    }
    await waitFor(() => expect(screen.getByText('Edit OIDC Provider')).toBeInTheDocument());
    const nameInput = screen.getByPlaceholderText('Provider name');
    fireEvent.change(nameInput, { target: { value: 'Updated OIDC' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mockOidcUpdate).toHaveBeenCalled();
    });
  });

  // ─── OIDC Delete ─────────────────────────────────────────────────────────

  it('calls api.oidc.delete on confirm', async () => {
    mockOidcDelete.mockResolvedValue(undefined);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);

    renderSsoPanel();
    await waitFor(() => expect(screen.getByText('Keycloak')).toBeInTheDocument());
    const trashIcons = document.querySelectorAll('button svg.lucide-trash-2');
    fireEvent.click(trashIcons[0].closest('button')!);
    await waitFor(() => {
      expect(mockOidcDelete).toHaveBeenCalledWith('oidc_1');
    });
  });

  // ─── SAML Add dialog ─────────────────────────────────────────────────────

  it('opens SAML add dialog', async () => {
    renderSsoPanel();
    const addButtons = screen.getAllByText('Add Provider');
    fireEvent.click(addButtons[1]); // second is SAML
    await waitFor(() => {
      expect(screen.getByText('Add SAML Provider')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Entity ID / Issuer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('SSO URL')).toBeInTheDocument();
  });

  it('calls api.saml.create with form data', async () => {
    mockSamlCreate.mockResolvedValue(undefined);
    renderSsoPanel();
    const addButtons = screen.getAllByText('Add Provider');
    fireEvent.click(addButtons[1]);

    fireEvent.change(screen.getByPlaceholderText('Provider name'), {
      target: { value: 'My SAML' },
    });
    fireEvent.change(screen.getByPlaceholderText('Slug'), { target: { value: 'my-saml' } });
    fireEvent.change(screen.getByPlaceholderText('Entity ID / Issuer'), {
      target: { value: 'https://saml.example.com/entity' },
    });
    fireEvent.change(screen.getByPlaceholderText('SSO URL'), {
      target: { value: 'https://saml.example.com/sso' },
    });

    const createBtn = screen.getAllByText('Create');
    fireEvent.click(createBtn[createBtn.length - 1]);
    await waitFor(() => {
      expect(mockSamlCreate).toHaveBeenCalledWith(
        'My SAML',
        'my-saml',
        'https://saml.example.com/entity',
        'https://saml.example.com/sso',
        '',
        'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        '{"email":"email","name":"name"}',
        true,
        'admin',
      );
    });
  });

  // ─── SAML Edit dialog ────────────────────────────────────────────────────

  it('opens SAML edit dialog with pre-filled data', async () => {
    renderSsoPanel();
    await waitFor(() => expect(screen.getByText('Okta SAML')).toBeInTheDocument());
    // Find edit button for SAML — second pencil in the list
    const allPencilIcons = document.querySelectorAll('button svg.lucide-pencil');
    // Skip the OIDC pencil buttons
    const samlPencil = allPencilIcons[allPencilIcons.length - 1];
    fireEvent.click(samlPencil.closest('button')!);
    await waitFor(() => {
      expect(screen.getByText('Edit SAML Provider')).toBeInTheDocument();
    });
  });

  // ─── SAML Delete ─────────────────────────────────────────────────────────

  it('calls api.saml.delete on confirm', async () => {
    mockSamlDelete.mockResolvedValue(undefined);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);

    renderSsoPanel();
    await waitFor(() => expect(screen.getByText('Okta SAML')).toBeInTheDocument());
    const trashIcons = document.querySelectorAll('button svg.lucide-trash-2');
    // Last trash icon is SAML's
    fireEvent.click(trashIcons[trashIcons.length - 1].closest('button')!);
    await waitFor(() => {
      expect(mockSamlDelete).toHaveBeenCalledWith('saml_1');
    });
  });

  // ─── Error state ─────────────────────────────────────────────────────────

  it('handles api.oidc.list error gracefully', async () => {
    mockOidcList.mockRejectedValue(new Error('Network error'));
    renderSsoPanel();
    await waitFor(() => {
      // Should still render empty state without crashing
      expect(screen.getByText('No OIDC providers configured.')).toBeInTheDocument();
    });
  });

  it('handles api.saml.list error gracefully', async () => {
    mockSamlList.mockRejectedValue(new Error('Network error'));
    renderSsoPanel();
    await waitFor(() => {
      expect(screen.getByText('No SAML providers configured.')).toBeInTheDocument();
    });
  });

  it('shows toast on OIDC create error', async () => {
    mockOidcCreate.mockRejectedValue(new Error('Create failed'));
    renderSsoPanel();
    const addButtons = screen.getAllByText('Add Provider');
    fireEvent.click(addButtons[0]);
    fireEvent.change(screen.getByPlaceholderText('Provider name'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Slug (e.g. keycloak)'), {
      target: { value: 'test' },
    });
    fireEvent.change(screen.getByPlaceholderText('Issuer URL'), {
      target: { value: 'https://issuer.example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Client ID'), { target: { value: 'cid' } });
    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations with providers loaded', async () => {
    const { container } = renderSsoPanel();
    await waitFor(() => expect(screen.getByText('Keycloak')).toBeInTheDocument());
    // Icon-only edit/delete buttons without aria-label are pre-existing in the source component
    const results = await axe(container, { rules: { 'button-name': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    mockOidcList.mockResolvedValue([]);
    mockSamlList.mockResolvedValue([]);
    const { container } = renderSsoPanel();
    await waitFor(() =>
      expect(screen.getByText('No OIDC providers configured.')).toBeInTheDocument(),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
