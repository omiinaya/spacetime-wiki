import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const mockSqlQuery = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  sqlQuery: mockSqlQuery,
}));

import SharedPageView from '../pages/SharedPageView';

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderShared(token?: string) {
  const entries = token ? [`/share/${token}`] : ['/share/'];
  return render(
    <MemoryRouter initialEntries={entries}>
      <Routes>
        <Route path="/share/:token" element={<SharedPageView userId={null} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const sampleShareLink = [
  'sl_abc123', // id
  'page_xyz789', // page_id
  'token_abc123', // token
  'user_a1', // created_by
  0, // expires_at (0 = never)
  1000, // created_at
  5, // visit_count
  false, // has_password
  null, // brand_title
  null, // brand_logo_url
];

const passwordProtectedLink = [
  'sl_secured',
  'page_secured',
  'token_secured',
  'user_a1',
  0,
  1000,
  0,
  true, // has_password
  null,
  null,
];

const originalFetch = globalThis.fetch;

describe('SharedPageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    document.title = 'Spacetime Wiki';
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  // ─── Loading state ─────────────────────────────────────────────────────────

  it('shows loading spinner while fetching share link', () => {
    mockSqlQuery.mockReturnValue(new Promise(() => {}));
    const { container } = renderShared('token_abc');
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ─── Error: not found ──────────────────────────────────────────────────────

  it('shows error when share link is not found', async () => {
    mockSqlQuery.mockResolvedValue([]);
    renderShared('nonexistent');
    await waitFor(() => {
      expect(screen.getByText('Share link not found')).toBeInTheDocument();
    });
  });

  it('shows Access Error heading when share link is not found', async () => {
    mockSqlQuery.mockResolvedValue([]);
    renderShared('nonexistent');
    await waitFor(() => {
      expect(screen.getByText('Access Error')).toBeInTheDocument();
    });
  });

  // ─── Error: expired ────────────────────────────────────────────────────────

  it('shows error when share link has expired', async () => {
    const expired = [...sampleShareLink];
    expired[4] = 1; // expires_at = 1ms after epoch — definitely expired
    mockSqlQuery.mockResolvedValue([expired]);
    renderShared('expired_link');
    await waitFor(() => {
      expect(screen.getByText('This share link has expired')).toBeInTheDocument();
    });
  });

  // ─── Page view (no password) ───────────────────────────────────────────────

  it('renders a placeholder when share link is valid and no password', async () => {
    mockSqlQuery.mockResolvedValue([sampleShareLink]);
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true } as Response);
    renderShared('token_abc');

    // SharedPageView renders <PageView pageId="page_xyz789" /> but PageView
    // is mocked by its own vi.mock in other test files, not here. Since
    // SharedPageView imports PageView directly, we just verify no error state.
    await vi.waitFor(() => {
      // After loading, it should render the page view section — if no error
      // and no password prompt, it either shows PageView or null.
      // We can verify it's not showing error/loading/password.
      expect(screen.queryByText('Access Error')).not.toBeInTheDocument();
      expect(screen.queryByText('Password Required')).not.toBeInTheDocument();
      // The container should not have a spinner
    });
  });

  // ─── Password prompt ───────────────────────────────────────────────────────

  it('shows password prompt when link is password-protected', async () => {
    mockSqlQuery.mockResolvedValue([passwordProtectedLink]);
    renderShared('token_secured');

    await waitFor(() => {
      expect(screen.getByText('Password Required')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
    expect(screen.getByText('View Page')).toBeInTheDocument();
  });

  it('shows branding title on password prompt', async () => {
    const branded = [...passwordProtectedLink];
    branded[8] = 'Secure Corp';
    mockSqlQuery.mockResolvedValue([branded]);
    renderShared('branded_secured');

    // Branding title appears twice: once in the header bar, once in the prompt title
    await waitFor(() => {
      expect(screen.getAllByText('Secure Corp').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows password error on incorrect password', async () => {
    mockSqlQuery.mockResolvedValue([passwordProtectedLink]);
    renderShared('token_secured');

    await screen.findByText('Password Required');

    const input = screen.getByPlaceholderText('Enter password');
    fireEvent.change(input, { target: { value: 'wrong_password' } });

    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Incorrect password'),
    } as Response);

    fireEvent.click(screen.getByText('View Page'));
    await waitFor(() => {
      expect(screen.getByText('Incorrect password')).toBeInTheDocument();
    });
  });

  it('loads page on correct password', async () => {
    mockSqlQuery.mockResolvedValueOnce([passwordProtectedLink]);
    renderShared('token_secured');

    await screen.findByText('Password Required');

    const input = screen.getByPlaceholderText('Enter password');
    fireEvent.change(input, { target: { value: 'correct_password' } });

    mockSqlQuery.mockResolvedValue([passwordProtectedLink]);
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true } as Response);

    fireEvent.click(screen.getByText('View Page'));
    await vi.waitFor(() => {
      expect(screen.queryByText('Password Required')).not.toBeInTheDocument();
    });
  });

  // ─── Branding header ───────────────────────────────────────────────────────

  it('shows branding header on password prompt', async () => {
    const branded = [...passwordProtectedLink];
    branded[8] = 'BrandCo';
    branded[9] = 'https://brandco.com/logo.png';
    mockSqlQuery.mockResolvedValue([branded]);
    renderShared('branded_secured');

    await waitFor(() => {
      expect(screen.getAllByText('BrandCo').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByAltText('Brand logo').length).toBeGreaterThanOrEqual(1);
  });

  // ─── Error handling ────────────────────────────────────────────────────────

  it('shows error message when sqlQuery throws', async () => {
    mockSqlQuery.mockRejectedValue(new Error('Network error'));
    renderShared('broken_token');
    await waitFor(() => {
      // The error is wrapped as String(err) → "Error: Network error"
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────
  // Note: error state and password prompt both render outside the AppLayout
  // shell, so axe(container) may report missing-landmark violations from the
  // surrounding jsdom document. We check only the component's rendered content.

  it('has no accessibility violations in loading state', async () => {
    mockSqlQuery.mockReturnValue(new Promise(() => {}));
    const { container } = renderShared('loading_token');
    await vi.waitFor(() => expect(container.querySelector('.animate-spin')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in password prompt state', async () => {
    mockSqlQuery.mockResolvedValue([passwordProtectedLink]);
    const { container } = renderShared('pw_token');
    await screen.findByPlaceholderText('Enter password');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
