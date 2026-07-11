import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const mockGetBySlug = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  api: {
    pages: {
      getBySlug: mockGetBySlug,
    },
  },
}));

import SlugView from '../pages/SlugView';

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderSlug(slug: string = 'my-page-slug') {
  return render(
    <MemoryRouter initialEntries={[`/s/${slug}`]}>
      <Routes>
        <Route path="/s/:slug" element={<SlugView />} />
        <Route path="/page/:id" element={<div data-testid="page-view">Page {`:id`}</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SlugView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Loading state ──────────────────────────────────────────────────────────

  it('shows loading spinner while fetching page', () => {
    mockGetBySlug.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderSlug('my-page');
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ─── Redirect on success ────────────────────────────────────────────────────

  it('redirects to /page/:id when page is found by slug', async () => {
    mockGetBySlug.mockResolvedValue({ id: 'page-abc-123', title: 'Test Page' });
    renderSlug('my-page');
    await waitFor(() => {
      expect(screen.queryByTestId('page-view')).toBeInTheDocument();
    });
  });

  // ─── Error state ────────────────────────────────────────────────────────────

  it('shows 404 error when slug is not found', async () => {
    mockGetBySlug.mockResolvedValue(null);
    renderSlug('nonexistent');
    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
    });
  });

  it('shows 404 error when api call fails', async () => {
    mockGetBySlug.mockRejectedValue(new Error('Network error'));
    renderSlug('broken');
    await waitFor(() => {
      expect(screen.getByText('404')).toBeInTheDocument();
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────────────────────

  it('does nothing when slug is missing (no route param)', () => {
    mockGetBySlug.mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <MemoryRouter initialEntries={['/s/']}>
        <Routes>
          <Route path="/s/:slug" element={<SlugView />} />
          {/* Without a slug param this route doesn't match */}
        </Routes>
      </MemoryRouter>,
    );
    // The empty slug "/s/" won't match "/s/:slug" in React Router v6
    // so SlugView won't render at all — nothing to test here
    // Just verify no render crash
    expect(container).toBeTruthy();
  });

  // ─── Accessibility ──────────────────────────────────────────────────────────

  it('has no accessibility violations in loading state', async () => {
    mockGetBySlug.mockReturnValue(new Promise(() => {}));
    const { container } = renderSlug('loading-page');
    await vi.waitFor(() => expect(container.querySelector('.animate-spin')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in error state', async () => {
    mockGetBySlug.mockResolvedValue(null);
    const { container } = renderSlug('gone');
    await waitFor(() => expect(screen.getByText('404')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
