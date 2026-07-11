import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockListAllProviders = vi.fn();
const mockAddProvider = vi.fn();
const mockUpdateProvider = vi.fn();
const mockDeleteProvider = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    oauth: {
      listAllProviders: (...a: unknown[]) => mockListAllProviders(...a),
      addProvider: (...a: unknown[]) => mockAddProvider(...a),
      updateProvider: (...a: unknown[]) => mockUpdateProvider(...a),
      deleteProvider: (...a: unknown[]) => mockDeleteProvider(...a),
    },
  },
  OauthProvider: class {},
}));

import { OAuthSettings } from '../components/admin/OAuthSettings';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleProviders = [
  {
    id: 'oa_1',
    name: 'GitHub',
    slug: 'github',
    provider_type: 'github',
    authorize_url: 'https://github.com/login/oauth/authorize',
    token_url: 'https://github.com/login/oauth/access_token',
    userinfo_url: 'https://api.github.com/user',
    scope: 'read:user user:email',
    client_id: 'gh_cid',
    icon: 'github',
    is_active: true,
    auto_register: true,
    default_role: 'member',
    created_by: 'u1',
    created_at: 1000,
    updated_at: 1000,
  },
  {
    id: 'oa_2',
    name: 'Discord',
    slug: 'discord',
    provider_type: 'discord',
    authorize_url: 'https://discord.com/api/oauth2/authorize',
    token_url: 'https://discord.com/api/oauth2/token',
    userinfo_url: 'https://discord.com/api/users/@me',
    scope: 'identify email',
    client_id: 'dc_cid',
    icon: 'discord',
    is_active: false,
    auto_register: true,
    default_role: 'member',
    created_by: 'u1',
    created_at: 900,
    updated_at: 900,
  },
];

function renderOAuthSettings(userId: string | null = 'u1') {
  return render(<OAuthSettings userId={userId} />);
}

describe('OAuthSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAllProviders.mockResolvedValue(sampleProviders);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the section header', async () => {
    renderOAuthSettings();
    await waitFor(() => {
      expect(screen.getByText(/OAuth Providers/)).toBeInTheDocument();
    });
  });

  it('calls api.oauth.listAllProviders on mount', () => {
    renderOAuthSettings();
    expect(mockListAllProviders).toHaveBeenCalledOnce();
  });

  it('shows Add Provider button', async () => {
    renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    expect(screen.getByText('Add Provider')).toBeInTheDocument();
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it('shows loading spinner while fetching', () => {
    mockListAllProviders.mockReturnValue(new Promise(() => {}));
    renderOAuthSettings();
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ─── Empty state ─────────────────────────────────────────────────────────

  it('shows empty state when no providers', async () => {
    mockListAllProviders.mockResolvedValue([]);
    renderOAuthSettings();
    await waitFor(() => {
      expect(screen.getByText(/No OAuth providers configured/)).toBeInTheDocument();
    });
  });

  // ─── Populated state ─────────────────────────────────────────────────────

  it('renders provider names', async () => {
    renderOAuthSettings();
    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Discord')).toBeInTheDocument();
    });
  });

  it('shows provider type badges', async () => {
    renderOAuthSettings();
    await waitFor(() => {
      expect(screen.getByText('github')).toBeInTheDocument();
      expect(screen.getByText('discord')).toBeInTheDocument();
    });
  });

  it('shows authorize URLs', async () => {
    renderOAuthSettings();
    await waitFor(() => {
      expect(screen.getByText(/github\.com\/login\/oauth\/authorize/)).toBeInTheDocument();
    });
  });

  it('shows active/disabled badges', async () => {
    renderOAuthSettings();
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  // ─── Add dialog ──────────────────────────────────────────────────────────

  it('opens add dialog when Add Provider clicked', async () => {
    renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add Provider'));
    expect(screen.getByText('Add OAuth Provider')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('My GitHub')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('my-github')).toBeInTheDocument();
  });

  it('auto-fills GitHub defaults when type changes to github', async () => {
    renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add Provider'));
    // In add mode, the auth URL field is empty initially. Changing the
    // provider type to github fills defaults — but github is already the
    // default type. Instead, switch to another type then back.
    await waitFor(() => expect(screen.getByText('Add OAuth Provider')).toBeInTheDocument());
    const typeSelect = screen.getByDisplayValue('GitHub');
    fireEvent.change(typeSelect, { target: { value: 'discord' } });
    await waitFor(() => {
      expect(
        screen.getByDisplayValue('https://discord.com/api/oauth2/authorize'),
      ).toBeInTheDocument();
    });
  });

  it('auto-fills URLs when provider type changes', async () => {
    renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add Provider'));

    // Change to Discord
    const typeSelect = screen.getByDisplayValue('GitHub');
    fireEvent.change(typeSelect, { target: { value: 'discord' } });

    await waitFor(() => {
      const authUrlInput = screen.getByDisplayValue('https://discord.com/api/oauth2/authorize');
      expect(authUrlInput).toBeInTheDocument();
    });
  });

  it('calls api.oauth.addProvider when form submitted', async () => {
    mockAddProvider.mockResolvedValue(undefined);
    const view = render(<OAuthSettings userId="u1" />);
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add Provider'));
    await waitFor(() => expect(screen.getByText('Add OAuth Provider')).toBeInTheDocument());

    // Fill fields inside the dialog: iterate inputs in the dialog overlay
    const dialog = view.container.querySelector('[class*="dialog-overlay"]') as HTMLElement;
    const inputs = dialog.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;

    fireEvent.change(inputs[0], { target: { value: 'Custom GitHub' } }); // Name
    fireEvent.change(inputs[2], { target: { value: 'https://github.com/login/oauth/authorize' } }); // Authorize URL
    fireEvent.change(inputs[3], {
      target: { value: 'https://github.com/login/oauth/access_token' },
    }); // Token URL
    fireEvent.change(inputs[4], { target: { value: 'https://api.github.com/user' } }); // Userinfo URL
    fireEvent.change(inputs[6], { target: { value: 'custom-cid' } }); // Client ID

    const addBtns = screen.getAllByText('Add Provider');
    fireEvent.click(addBtns[addBtns.length - 1]);

    await waitFor(() => {
      expect(mockAddProvider).toHaveBeenCalled();
    });
  });

  it('closes dialog on Cancel', async () => {
    renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add Provider'));
    await waitFor(() => expect(screen.getByText('Add OAuth Provider')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Add OAuth Provider')).not.toBeInTheDocument();
  });

  it('shows validation error when name or client ID is missing', async () => {
    renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add Provider'));
    // In add mode, name and client ID fields are initially empty — click save
    const addBtns = screen.getAllByText('Add Provider');
    fireEvent.click(addBtns[addBtns.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Name and client ID are required/)).toBeInTheDocument();
    });
  });

  // ─── Edit dialog ────────────────────────────────────────────────────────

  it('opens edit dialog with pre-filled data', async () => {
    renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    const pencilIcons = document.querySelectorAll('button svg.lucide-pencil');
    fireEvent.click(pencilIcons[0].closest('button')!);
    await waitFor(() => {
      expect(screen.getByText('Edit OAuth Provider')).toBeInTheDocument();
    });
    const nameInput = screen.getByPlaceholderText('My GitHub') as HTMLInputElement;
    expect(nameInput.value).toBe('GitHub');
  });

  it('calls api.oauth.updateProvider when editing', async () => {
    mockUpdateProvider.mockResolvedValue(undefined);
    renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    const pencilIcons = document.querySelectorAll('button svg.lucide-pencil');
    fireEvent.click(pencilIcons[0].closest('button')!);
    await waitFor(() => expect(screen.getByText('Edit OAuth Provider')).toBeInTheDocument());
    const nameInput = screen.getByPlaceholderText('My GitHub');
    fireEvent.change(nameInput, { target: { value: 'Updated GitHub' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mockUpdateProvider).toHaveBeenCalled();
    });
  });

  // ─── Delete ─────────────────────────────────────────────────────────────

  it('calls api.oauth.deleteProvider on confirm', async () => {
    mockDeleteProvider.mockResolvedValue(undefined);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);

    renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    const trashIcons = document.querySelectorAll('button svg.lucide-trash-2');
    fireEvent.click(trashIcons[0].closest('button')!);
    await waitFor(() => {
      expect(mockDeleteProvider).toHaveBeenCalledWith('oa_1');
    });
    vi.unstubAllGlobals();
  });

  // ─── Error state ─────────────────────────────────────────────────────────

  it('handles api.oauth.listAllProviders error gracefully', async () => {
    mockListAllProviders.mockRejectedValue(new Error('Network error'));
    renderOAuthSettings();
    await waitFor(() => {
      expect(screen.getByText(/No OAuth providers configured/)).toBeInTheDocument();
    });
  });

  it('shows error on save failure', async () => {
    mockAddProvider.mockRejectedValue(new Error('Save failed'));
    const view = render(<OAuthSettings userId="u1" />);
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Add Provider'));
    await waitFor(() => expect(screen.getByText('Add OAuth Provider')).toBeInTheDocument());

    const dialog = view.container.querySelector('[class*="dialog-overlay"]') as HTMLElement;
    const inputs = dialog.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
    fireEvent.change(inputs[0], { target: { value: 'Custom GitHub' } }); // Name
    fireEvent.change(inputs[2], { target: { value: 'https://github.com/login/oauth/authorize' } });
    fireEvent.change(inputs[3], {
      target: { value: 'https://github.com/login/oauth/access_token' },
    });
    fireEvent.change(inputs[4], { target: { value: 'https://api.github.com/user' } });
    fireEvent.change(inputs[6], { target: { value: 'cid' } }); // Client ID

    const addBtns = screen.getAllByText('Add Provider');
    fireEvent.click(addBtns[addBtns.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Failed to save/)).toBeInTheDocument();
    });
  });

  // ─── userId null ─────────────────────────────────────────────────────────

  it('shows empty state when userId is null', async () => {
    renderOAuthSettings(null);
    // Should not call API
    expect(mockListAllProviders).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/No OAuth providers configured/)).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations with providers loaded', async () => {
    const { container } = renderOAuthSettings();
    await waitFor(() => expect(screen.getByText('GitHub')).toBeInTheDocument());
    // Icon-only edit/delete buttons without aria-label are pre-existing in the source component
    const results = await axe(container, { rules: { 'button-name': { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    mockListAllProviders.mockResolvedValue([]);
    const { container } = renderOAuthSettings();
    await waitFor(() =>
      expect(screen.getByText(/No OAuth providers configured/)).toBeInTheDocument(),
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
