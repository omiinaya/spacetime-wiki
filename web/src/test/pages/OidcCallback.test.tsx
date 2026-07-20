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
  oidc: { get: vi.fn() },
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

import OidcCallback from '../../pages/OidcCallback';

describe('OidcCallback', () => {
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
        <OidcCallback />
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
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Authentication failed: No authorization code')).toBeTruthy();
    });
  });

  it('shows error when no OIDC provider configured', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'code-123';
      return null;
    });

    render(
      <BrowserRouter>
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('No OIDC provider configured')).toBeTruthy();
    });
  });

  it('shows error when OIDC provider not found', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'code-123';
      return null;
    });
    store['sw_oidc_provider_id'] = 'provider-1';
    store['sw_oauth_verifier'] = 'verifier-abc';
    __mockApi.oidc.get.mockResolvedValue(null);

    render(
      <BrowserRouter>
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('OIDC provider not found')).toBeTruthy();
    });
  });

  it('shows exchanging code status', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'code-123';
      return null;
    });
    store['sw_oidc_provider_id'] = 'provider-1';
    store['sw_oauth_verifier'] = 'verifier-abc';
    __mockApi.oidc.get.mockResolvedValue({
      id: 'provider-1',
      client_id: 'client-abc',
      issuer_url: 'https://idp.example.com',
      scopes: 'openid email',
    });
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <BrowserRouter>
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Exchanging code...')).toBeTruthy();
    });
  });

  it('shows token error on OIDC token exchange failure', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'code-123';
      return null;
    });
    store['sw_oidc_provider_id'] = 'provider-1';
    store['sw_oauth_verifier'] = 'verifier-abc';
    __mockApi.oidc.get.mockResolvedValue({
      id: 'provider-1',
      client_id: 'client-abc',
      issuer_url: 'https://idp.example.com',
      scopes: 'openid email',
    });

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              token_endpoint: 'https://idp.example.com/token',
              userinfo_endpoint: 'https://idp.example.com/userinfo',
            }),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ error: 'invalid_grant', error_description: 'Code expired' }),
      });
    });

    render(
      <BrowserRouter>
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Token error: Code expired')).toBeTruthy();
    });
  });

  it('extracts email from id_token and signs in existing user', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'code-123';
      return null;
    });
    store['sw_oidc_provider_id'] = 'provider-1';
    store['sw_oauth_verifier'] = 'verifier-abc';
    __mockApi.oidc.get.mockResolvedValue({
      id: 'provider-1',
      client_id: 'client-abc',
      issuer_url: 'https://idp.example.com',
      scopes: 'openid email',
    });

    // Create a fake id_token JWT with email in payload
    const payload = btoa(
      JSON.stringify({ email: 'user@idp.com', name: 'OIDC User', sub: 'abc123' }),
    );
    const idToken = `header.${payload}.signature`;

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              token_endpoint: 'https://idp.example.com/token',
              userinfo_endpoint: 'https://idp.example.com/userinfo',
            }),
        });
      }
      return Promise.resolve({
        json: () =>
          Promise.resolve({ access_token: 'at-123', id_token: idToken, error: undefined }),
      });
    });

    __mockApi.users.getByEmail.mockResolvedValue({ id: 'user-existing' });

    render(
      <BrowserRouter>
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(setItemSpy).toHaveBeenCalledWith('sw_user_id', 'user-existing');
  });

  it('fetches userinfo endpoint when id_token has no email', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'code-123';
      return null;
    });
    store['sw_oidc_provider_id'] = 'provider-1';
    store['sw_oauth_verifier'] = 'verifier-abc';
    __mockApi.oidc.get.mockResolvedValue({
      id: 'provider-1',
      client_id: 'client-abc',
      issuer_url: 'https://idp.example.com',
      scopes: 'openid email',
    });

    // id_token with no email
    const payload = btoa(JSON.stringify({ sub: 'abc123' }));
    const idToken = `header.${payload}.signature`;

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              token_endpoint: 'https://idp.example.com/token',
              userinfo_endpoint: 'https://idp.example.com/userinfo',
            }),
        });
      }
      if (callCount === 2) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({ access_token: 'at-123', id_token: idToken, error: undefined }),
        });
      }
      // Don't resolve the 3rd (userinfo) fetch so we can see "Fetching profile..."
      return new Promise(() => {});
    });

    render(
      <BrowserRouter>
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Fetching profile...')).toBeTruthy();
    });
  });

  it('shows error when no email from either source', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'code-123';
      return null;
    });
    store['sw_oidc_provider_id'] = 'provider-1';
    store['sw_oauth_verifier'] = 'verifier-abc';
    __mockApi.oidc.get.mockResolvedValue({
      id: 'provider-1',
      client_id: 'client-abc',
      issuer_url: 'https://idp.example.com',
      scopes: 'openid email',
    });

    // id_token and userinfo both have no email
    const payload = btoa(JSON.stringify({ sub: 'abc123' }));
    const idToken = `header.${payload}.signature`;

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              token_endpoint: 'https://idp.example.com/token',
              userinfo_endpoint: 'https://idp.example.com/userinfo',
            }),
        });
      }
      if (callCount === 2) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({ access_token: 'at-123', id_token: idToken, error: undefined }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({ name: 'No Email' }) });
    });

    render(
      <BrowserRouter>
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Could not get email from provider')).toBeTruthy();
    });
  });

  it('shows error on fetch failure', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'code-123';
      return null;
    });
    store['sw_oidc_provider_id'] = 'provider-1';
    store['sw_oauth_verifier'] = 'verifier-abc';
    __mockApi.oidc.get.mockResolvedValue({
      id: 'provider-1',
      client_id: 'client-abc',
      issuer_url: 'https://idp.example.com',
      scopes: 'openid email',
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Discovery failed'));

    render(
      <BrowserRouter>
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Error: Discovery failed')).toBeTruthy();
    });
  });

  it('clears localStorage items', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'code-123';
      return null;
    });
    store['sw_oidc_provider_id'] = 'provider-1';
    store['sw_oauth_verifier'] = 'verifier-abc';
    __mockApi.oidc.get.mockResolvedValue({
      id: 'provider-1',
      client_id: 'client-abc',
      issuer_url: 'https://idp.example.com',
      scopes: 'openid email',
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'));

    render(
      <BrowserRouter>
        <OidcCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(removeItemSpy).toHaveBeenCalledWith('sw_oauth_verifier');
    });
    expect(removeItemSpy).toHaveBeenCalledWith('sw_oidc_provider_id');
  });
});
