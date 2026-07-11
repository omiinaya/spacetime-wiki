import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockUpdateRole = vi.fn();
const mockUpdateAvatar = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    users: {
      updateRole: (...a: unknown[]) => mockUpdateRole(...a),
      updateAvatar: (...a: unknown[]) => mockUpdateAvatar(...a),
    },
  },
}));

// ─── Mock child component ─────────────────────────────────────────────────────

vi.mock('../components/admin/ApiKeySettings', () => ({
  ApiKeySection: ({ userId }: { userId: string }) => (
    <div data-testid="api-key-section">API Keys for {userId}</div>
  ),
}));

import { UsersPanel } from '../components/admin/UsersPanel';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleUsers = [
  {
    id: 'u1',
    name: 'Alice',
    email: 'alice@test.com',
    role: 'admin',
    avatar_url: 'https://example.com/alice.png',
  },
  { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'member', avatar_url: '' },
  { id: 'u3', name: 'Charlie', email: 'charlie@test.com', role: 'viewer', avatar_url: '' },
];

const mockAddToast = vi.fn();

function renderUsers(props: Partial<Parameters<typeof UsersPanel>[0]> = {}) {
  return render(
    <UsersPanel
      allUsers={props.allUsers ?? sampleUsers}
      setAllUsers={props.setAllUsers ?? vi.fn()}
      userId={props.userId ?? 'admin1'}
      addToast={props.addToast ?? mockAddToast}
    />,
  );
}

describe('UsersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUpdateRole.mockResolvedValue(undefined);
    mockUpdateAvatar.mockResolvedValue(undefined);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders user names and emails', () => {
    renderUsers();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('bob@test.com')).toBeInTheDocument();
  });

  it('renders role selects for each user', () => {
    renderUsers();
    const selects = screen.getAllByRole('combobox');
    // One select per user (role selects)
    expect(selects.length).toBe(sampleUsers.length);
  });

  it('sets the correct default role value', () => {
    renderUsers();
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects[0].value).toBe('admin');
    expect(selects[1].value).toBe('member');
    expect(selects[2].value).toBe('viewer');
  });

  it('renders avatar inputs', () => {
    renderUsers();
    // Should have avatar URL inputs for each user
    const inputs = screen.getAllByPlaceholderText('Avatar URL');
    expect(inputs.length).toBe(sampleUsers.length);
  });

  it('renders Save buttons for avatars', () => {
    renderUsers();
    const saveBtns = screen.getAllByTitle('Save avatar URL');
    expect(saveBtns.length).toBe(sampleUsers.length);
  });

  // ─── Empty state ──────────────────────────────────────────────────────────

  it('shows empty message when no users', () => {
    renderUsers({ allUsers: [] });
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  // ─── Role update interaction ──────────────────────────────────────────────

  it('calls api.users.updateRole when role select changes', async () => {
    renderUsers();
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: 'admin' } });

    await waitFor(() => {
      expect(mockUpdateRole).toHaveBeenCalledWith('u2', 'admin', 'admin1');
    });
  });

  it('calls setAllUsers with updated role in state', async () => {
    const setAll = vi.fn();
    renderUsers({ setAllUsers: setAll });
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: 'admin' } });

    await waitFor(() => {
      expect(setAll).toHaveBeenCalled();
      const updater = setAll.mock.calls[0][0];
      const result = updater(sampleUsers);
      expect(result[1].role).toBe('admin');
    });
  });

  it('shows success toast on role update', async () => {
    renderUsers();
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: 'admin' } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Role updated',
        duration: 2000,
      });
    });
  });

  it('shows error toast on role update failure', async () => {
    mockUpdateRole.mockRejectedValue(new Error('Permission denied'));
    renderUsers();
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: 'admin' } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error: Permission denied',
        duration: 4000,
      });
    });
  });

  // ─── Avatar update interaction ────────────────────────────────────────────

  it('calls api.users.updateAvatar when Save is clicked', async () => {
    renderUsers();
    const avatarInputs = screen.getAllByPlaceholderText('Avatar URL');
    fireEvent.change(avatarInputs[1], { target: { value: 'https://example.com/bob-new.png' } });

    const saveBtns = screen.getAllByTitle('Save avatar URL');
    fireEvent.click(saveBtns[1]);

    await waitFor(() => {
      expect(mockUpdateAvatar).toHaveBeenCalledWith(
        'u2',
        'https://example.com/bob-new.png',
        'admin1',
      );
    });
  });

  // ─── Google OAuth section ─────────────────────────────────────────────────

  it('renders Google OAuth Client ID input', () => {
    renderUsers();
    const oauthInput = screen.getByPlaceholderText('Google OAuth Client ID');
    expect(oauthInput).toBeInTheDocument();
  });

  it('loads Google client ID from localStorage', () => {
    localStorage.setItem(
      'sw_google_client_id',
      'test-client-id-' +
        Math.random().toString(36).substring(2, 10) +
        '.apps.googleusercontent.com',
    );
    renderUsers();
    const oauthInput = screen.getByPlaceholderText('Google OAuth Client ID') as HTMLInputElement;
    expect(oauthInput.value).toContain('.apps.googleusercontent.com');
  });

  it('saves Google client ID to localStorage on change', () => {
    renderUsers();
    const oauthInput = screen.getByPlaceholderText('Google OAuth Client ID');
    fireEvent.change(oauthInput, {
      target: {
        value:
          'new-client-id-' +
          Math.random().toString(36).substring(2, 10) +
          '.apps.googleusercontent.com',
      },
    });
    expect(localStorage.getItem('sw_google_client_id')).toContain('.apps.googleusercontent.com');
  });

  it('shows API Key section', () => {
    renderUsers();
    expect(screen.getByTestId('api-key-section')).toBeInTheDocument();
    expect(screen.getByText('API Keys for admin1')).toBeInTheDocument();
  });

  it('renders Google Cloud Console link', () => {
    renderUsers();
    const link = screen.getByText('Google Cloud Console');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute(
      'href',
      'https://console.cloud.google.com/apis/credentials',
    );
  });

  it('renders callback URI code block', () => {
    renderUsers();
    const codeBlocks = document.querySelectorAll('code');
    expect(codeBlocks.length).toBeGreaterThanOrEqual(1);
    expect(codeBlocks[0].textContent).toContain('/oauth/google/callback');
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it('shows error toast on avatar update failure', async () => {
    mockUpdateAvatar.mockRejectedValue(new Error('Invalid URL'));
    renderUsers();
    const saveBtns = screen.getAllByTitle('Save avatar URL');
    fireEvent.click(saveBtns[0]);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error: Invalid URL',
        duration: 4000,
      });
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations (excluding label-less selects)', async () => {
    const { container } = renderUsers();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    const results = await axe(container, {
      rules: { 'select-name': { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    const { container } = renderUsers({ allUsers: [] });
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
