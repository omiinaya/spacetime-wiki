import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// We mock api and helpers, but GoogleCallback uses api.users.getByEmail and callReducerLocal
const __mockApi = vi.hoisted(() => ({
  users: { getByEmail: vi.fn() },
}));

vi.mock('../../lib/api', () => ({ api: __mockApi }));

const mockCallReducer = vi.hoisted(() => vi.fn());
vi.mock('../../lib/helpers', () => ({
  callReducerLocal: mockCallReducer,
}));

let store: Record<string, string> = {};
let setItemSpy: any;
let removeItemSpy: any;

import GoogleCallback from '../../pages/GoogleCallback';

describe('GoogleCallback', () => {
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
        <GoogleCallback />
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
        <GoogleCallback />
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
    // Keep the first fetch pending so the component stays at "Exchanging code..."
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <BrowserRouter>
        <GoogleCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Exchanging code...')).toBeTruthy();
    });
  });

  it('shows token error on OAuth token failure', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'bad-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_google_client_id'] = 'client-xyz';

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ error: 'invalid_grant', error_description: 'Code was already redeemed' }),
    });

    render(
      <BrowserRouter>
        <GoogleCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Token error: Code was already redeemed')).toBeTruthy();
    });
  });

  it('shows error when Google profile has no email', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'good-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_google_client_id'] = 'client-xyz';

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Token endpoint
        return Promise.resolve({ json: () => Promise.resolve({ access_token: 'at-123' }) });
      }
      // Userinfo endpoint
      return Promise.resolve({ json: () => Promise.resolve({ email: undefined }) });
    });

    render(
      <BrowserRouter>
        <GoogleCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Could not get email from Google')).toBeTruthy();
    });
  });

  it('signs in existing user successfully', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'good-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_google_client_id'] = 'client-xyz';

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ json: () => Promise.resolve({ access_token: 'at-123' }) });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ email: 'user@gmail.com', name: 'Test User' }),
      });
    });

    __mockApi.users.getByEmail.mockResolvedValue({ id: 'user-abc' });

    render(
      <BrowserRouter>
        <GoogleCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(setItemSpy).toHaveBeenCalledWith('sw_user_id', 'user-abc');
  });

  it('registers new user successfully', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'good-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_google_client_id'] = 'client-xyz';

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ json: () => Promise.resolve({ access_token: 'at-123' }) });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ email: 'newuser@gmail.com', name: 'New User' }),
      });
    });

    __mockApi.users.getByEmail.mockResolvedValue(null);

    render(
      <BrowserRouter>
        <GoogleCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(mockCallReducer).toHaveBeenCalled();
    });
    // callReducerLocal was called with register_user
    const callArgs = mockCallReducer.mock.calls[0];
    expect(callArgs[0]).toBe('register_user');
    expect(callArgs[1][2]).toBe('newuser@gmail.com');
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows error when fetch throws', async () => {
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key: string) => {
      if (key === 'code') return 'good-code';
      return null;
    });
    store['sw_oauth_verifier'] = 'verifier-abc';
    store['sw_google_client_id'] = 'client-xyz';

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <BrowserRouter>
        <GoogleCallback />
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
    store['sw_google_client_id'] = 'client-xyz';

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    });

    render(
      <BrowserRouter>
        <GoogleCallback />
      </BrowserRouter>,
    );
    await waitFor(() => {
      expect(removeItemSpy).toHaveBeenCalledWith('sw_oauth_verifier');
    });
  });
});
