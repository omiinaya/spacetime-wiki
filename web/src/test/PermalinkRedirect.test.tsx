import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const mockGetPage = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  api: {
    pages: {
      get: mockGetPage,
    },
  },
}));

import PermalinkRedirect from '../pages/PermalinkRedirect';

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderPermalink(id: string = 'page-abc-123') {
  return render(
    <MemoryRouter initialEntries={[`/p/${id}`]}>
      <Routes>
        <Route path="/p/:id" element={<PermalinkRedirect />} />
        <Route path="/page/:id" element={<div data-testid="page-view">Page {`:id`}</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PermalinkRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.hash
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hash: '', href: 'http://localhost/', origin: 'http://localhost' },
    });
  });

  // ─── Loading state ──────────────────────────────────────────────────────────

  it('shows loading spinner while fetching page', () => {
    mockGetPage.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderPermalink('page-abc-123');
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ─── Redirect on success ────────────────────────────────────────────────────

  it('redirects to /page/:id when page is found', async () => {
    mockGetPage.mockResolvedValue({ id: 'page-abc-123', title: 'Test Page' });
    renderPermalink('page-abc-123');
    await waitFor(() => {
      expect(screen.queryByTestId('page-view')).toBeInTheDocument();
    });
  });

  it('redirects with hash anchor when present', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { hash: '#section-heading', href: 'http://localhost/', origin: 'http://localhost' },
    });
    // We can't easily test the hash in MemoryRouter navigation,
    // but we can verify get is called and navigation fires
    mockGetPage.mockResolvedValue({ id: 'page-abc-123', title: 'Test Page' });
    renderPermalink('page-abc-123');
    await waitFor(() => {
      expect(screen.queryByTestId('page-view')).toBeInTheDocument();
    });
  });

  // ─── Error state ────────────────────────────────────────────────────────────

  it('shows 404 error when page is not found', async () => {
    mockGetPage.mockResolvedValue(null);
    renderPermalink('nonexistent-id');
    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
  });

  it('shows 404 error when API call fails', async () => {
    mockGetPage.mockRejectedValue(new Error('Network error'));
    renderPermalink('bad-id');
    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Page not found')).toBeInTheDocument();
    });
  });

  it('shows loading spinner when id param is missing (no redirect attempted)', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/p/']}>
        <Routes>
          <Route path="/p/" element={<PermalinkRedirect />} />
        </Routes>
      </MemoryRouter>,
    );
    // Without an id param, the effect returns early and spinner stays showing
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(mockGetPage).not.toHaveBeenCalled();
  });

  // ─── Accessibility ──────────────────────────────────────────────────────────

  it('has no accessibility violations in error state', async () => {
    mockGetPage.mockResolvedValue(null);
    const { container } = renderPermalink('nonexistent');
    await waitFor(() => expect(screen.getByText('404')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
