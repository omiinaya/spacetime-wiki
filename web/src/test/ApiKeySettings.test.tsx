import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockApiKeysList = vi.fn();
const mockApiKeysCreate = vi.fn();
const mockApiKeysRevoke = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    apiKeys: {
      list: (...a: unknown[]) => mockApiKeysList(...a),
      create: (...a: unknown[]) => mockApiKeysCreate(...a),
      revoke: (...a: unknown[]) => mockApiKeysRevoke(...a),
    },
  },
  ApiKey: class {},
}));

// ─── Mock crypto ──────────────────────────────────────────────────────────────

const mockGetRandomValues = vi.fn();
const mockDigest = vi.fn();

beforeEach(() => {
  mockGetRandomValues.mockImplementation((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
    return arr;
  });
  mockDigest.mockResolvedValue(new Uint8Array(Array.from({ length: 32 }, (_, i) => i)).buffer);
});

vi.stubGlobal('crypto', {
  getRandomValues: mockGetRandomValues,
  subtle: {
    digest: mockDigest,
  },
  randomUUID: vi.fn(() => '550e8400-e29b-41d4-a716-446655440000'),
});

import { ApiKeySection } from '../components/admin/ApiKeySettings';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleKeys = [
  {
    id: 'ak1',
    user_id: 'u1',
    name: 'Dev Key',
    key_hash: 'abc',
    key_prefix: 'sw_a1b2c3d4',
    last_used_at: 2000,
    created_at: 1000,
    expires_at: 0,
    is_revoked: false,
  },
  {
    id: 'ak2',
    user_id: 'u1',
    name: 'CI Key',
    key_hash: 'def',
    key_prefix: 'sw_e5f6g7h8',
    last_used_at: 1500,
    created_at: 900,
    expires_at: 86400000,
    is_revoked: false,
  },
];

function renderApiKeys(props: { userId?: string | null } = {}) {
  return render(<ApiKeySection userId={'userId' in props ? props.userId : 'u1'} />);
}

describe('ApiKeySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiKeysList.mockResolvedValue(sampleKeys);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('calls api.apiKeys.list on mount', () => {
    renderApiKeys();
    expect(mockApiKeysList).toHaveBeenCalledWith('u1');
  });

  it('does not call api.apiKeys.list when userId is null', () => {
    renderApiKeys({ userId: null });
    expect(mockApiKeysList).not.toHaveBeenCalled();
  });

  it('renders key items with names', async () => {
    renderApiKeys();
    await waitFor(() => {
      expect(screen.getByText('Dev Key')).toBeInTheDocument();
      expect(screen.getByText('CI Key')).toBeInTheDocument();
    });
  });

  it('shows key prefixes', async () => {
    renderApiKeys();
    await waitFor(() => {
      expect(screen.getByText(/sw_a1b2c3d4/)).toBeInTheDocument();
      expect(screen.getByText(/sw_e5f6g7h8/)).toBeInTheDocument();
    });
  });

  it('shows Revoke button for each key', async () => {
    renderApiKeys();
    await waitFor(() => {
      expect(screen.getByText('Dev Key')).toBeInTheDocument();
    });
    const revokeBtns = screen.getAllByText('Revoke');
    expect(revokeBtns.length).toBe(2);
  });

  // ─── Empty state ──────────────────────────────────────────────────────────

  it('shows no keys when list is empty', async () => {
    mockApiKeysList.mockResolvedValue([]);
    renderApiKeys();
    await waitFor(() => {
      expect(screen.queryByText('Revoke')).not.toBeInTheDocument();
    });
    // The input fields and Create button should still render
    expect(screen.getByPlaceholderText('Key name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Days')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  // ─── Create key form ──────────────────────────────────────────────────────

  it('renders create key form inputs', () => {
    renderApiKeys();
    expect(screen.getByPlaceholderText('Key name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Days')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('calls crypto.getRandomValues and api.apiKeys.create when submitting', async () => {
    mockApiKeysCreate.mockResolvedValue(undefined);
    mockApiKeysList.mockResolvedValue(sampleKeys); // for the refetch
    renderApiKeys();
    await waitFor(() => expect(screen.getByText('Dev Key')).toBeInTheDocument());

    const nameInput = screen.getByPlaceholderText('Key name');
    fireEvent.change(nameInput, { target: { value: 'My New Key' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(mockGetRandomValues).toHaveBeenCalled();
      expect(mockDigest).toHaveBeenCalled();
      expect(mockApiKeysCreate).toHaveBeenCalledWith(
        'u1',
        'My New Key',
        expect.any(String),
        expect.any(String),
        0,
      );
    });
  });

  it('shows the newly created key in a readonly input', async () => {
    mockApiKeysCreate.mockResolvedValue(undefined);
    mockApiKeysList.mockResolvedValue(sampleKeys);
    renderApiKeys();
    await waitFor(() => expect(screen.getByText('Dev Key')).toBeInTheDocument());

    const nameInput = screen.getByPlaceholderText('Key name');
    fireEvent.change(nameInput, { target: { value: 'Test Key' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText(/New API key created/)).toBeInTheDocument();
    });
    // The generated key starts with sw_
    const keyInput = screen.getByDisplayValue(/^sw_/) as HTMLInputElement;
    expect(keyInput).toBeInTheDocument();
    expect(keyInput.readOnly).toBe(true);
  });

  it('does not create key when name is empty', async () => {
    renderApiKeys();
    await waitFor(() => expect(screen.getByText('Dev Key')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Create'));
    expect(mockApiKeysCreate).not.toHaveBeenCalled();
  });

  it('does not create key when userId is null', async () => {
    renderApiKeys({ userId: null });
    // The Create button exists but handleCreate returns early when !userId
    const createBtn = screen.getByText('Create');
    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('Key name');
      fireEvent.change(nameInput, { target: { value: 'Test' } });
    });
    fireEvent.click(createBtn);
    expect(mockApiKeysCreate).not.toHaveBeenCalled();
  });

  // ─── Revoke key ───────────────────────────────────────────────────────────

  it('calls api.apiKeys.revoke when Revoke is clicked', async () => {
    mockApiKeysRevoke.mockResolvedValue(undefined);
    renderApiKeys();
    await waitFor(() => expect(screen.getByText('Dev Key')).toBeInTheDocument());

    const revokeBtns = screen.getAllByText('Revoke');
    fireEvent.click(revokeBtns[0]);

    await waitFor(() => {
      expect(mockApiKeysRevoke).toHaveBeenCalledWith('ak1');
    });
  });

  it('removes the key from the list after revoking', async () => {
    mockApiKeysRevoke.mockResolvedValue(undefined);
    renderApiKeys();
    await waitFor(() => expect(screen.getByText('Dev Key')).toBeInTheDocument());

    const revokeBtns = screen.getAllByText('Revoke');
    fireEvent.click(revokeBtns[0]);

    await waitFor(() => {
      expect(screen.queryByText('Dev Key')).not.toBeInTheDocument();
    });
    // CI Key should still be there
    expect(screen.getByText('CI Key')).toBeInTheDocument();
  });

  // ─── Expiry input ─────────────────────────────────────────────────────────

  it('updates expiry days input', async () => {
    renderApiKeys();
    await waitFor(() => expect(screen.getByText('Dev Key')).toBeInTheDocument());

    const daysInput = screen.getByPlaceholderText('Days') as HTMLInputElement;
    fireEvent.change(daysInput, { target: { value: '30' } });
    expect(daysInput.value).toBe('30');
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it('handles API create error gracefully', async () => {
    const alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);
    mockApiKeysCreate.mockRejectedValue(new Error('Creation failed'));
    mockApiKeysList.mockResolvedValue(sampleKeys);
    renderApiKeys();
    await waitFor(() => expect(screen.getByText('Dev Key')).toBeInTheDocument());

    const nameInput = screen.getByPlaceholderText('Key name');
    fireEvent.change(nameInput, { target: { value: 'Fail Key' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalled();
    });
    vi.unstubAllGlobals();
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations with keys', async () => {
    const { container } = renderApiKeys();
    await waitFor(() => expect(screen.getByText('Dev Key')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    mockApiKeysList.mockResolvedValue([]);
    const { container } = renderApiKeys();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Key name')).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
