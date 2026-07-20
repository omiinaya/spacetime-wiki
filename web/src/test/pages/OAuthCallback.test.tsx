import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const __mockApi = vi.hoisted(() => ({
  users: { getByEmail: vi.fn() },
}));

vi.mock('../../lib/api', () => ({ api: __mockApi }));

const mockCallReducer = vi.hoisted(() => vi.fn());
vi.mock('../../lib/helpers', () => ({
  callReducerLocal: mockCallReducer,
}));

let store: Record<string, string> = {};
let setItemSpy: Mock;
let removeItemSpy: Mock;

import OAuthCallback from '../../pages/OAuthCallback';

describe('OAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] ?? null);
    setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation((key: string, value: string) => {
        store[key] = value;
      });
    removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete store[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows error when URL has error param', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'error') return 'access_denied';
      return null;
    });

    render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Authentication failed: access_denied')).toBeTruthy();
    });
  });

  it('shows error when no code param', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation(() => null);

    render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Authentication failed: No authorization code')).toBeTruthy();
    });
  });

  it('shows exchanging code status after render', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'auth-code-123';
      return null;
    });
    store['sw_oauth_provider_id'] = 'provider-1';
    store['sw_oauth_verifier'] = 'verifier-abc';
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Exchanging code...')).toBeTruthy();
    });
  });

  it('shows error when backend callback fails', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'bad-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_oauth_provider_id'] = 'provider-1';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Invalid code'),
    });

    render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Error: Invalid code')).toBeTruthy();
    });
  });

  it('shows error when backend returns no user', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'good-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_oauth_provider_id'] = 'provider-1';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: null }),
    });

    render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Error: No user returned from authentication')).toBeTruthy();
    });
  });

  it('signs in existing user successfully', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'good-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_oauth_provider_id'] = 'provider-1';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: 'user-oauth', email: 'test@example.com' } }),
    });

    render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(setItemSpy).toHaveBeenCalledWith('sw_user_id', 'user-oauth');
    expect(setItemSpy).toHaveBeenCalledWith('sw_user_email', 'test@example.com');
  });

  it('shows error when fetch throws', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'good-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_oauth_provider_id'] = 'provider-1';

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeTruthy();
    });
  });

  it('clears oauth_verifier from localStorage', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'good-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_oauth_provider_id'] = 'provider-1';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: 'u1' } }),
    });

    render(
      <BrowserRouter>
        <OAuthCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(removeItemSpy).toHaveBeenCalledWith('sw_oauth_verifier');
    });
  });
});
