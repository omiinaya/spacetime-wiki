import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockListCollections = vi.hoisted(() => vi.fn());
const mockListUsers = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  api: {
    collections: { list: mockListCollections },
    users: { list: mockListUsers },
  },
  Collection: class {},
}));

import { SearchFilters, EMPTY_FILTERS, type SearchFilterState } from '../components/SearchFilters';

const sampleCollections = [
  {
    id: 'c1',
    name: 'Engineering',
    icon: '⚙️',
    slug: 'eng',
    color: '',
    description: '',
    parent_id: '',
    sort_order: 0,
    created_by: '',
    created_at: 0,
    updated_at: 0,
  },
  {
    id: 'c2',
    name: 'Design',
    icon: '🎨',
    slug: 'design',
    color: '',
    description: '',
    parent_id: '',
    sort_order: 1,
    created_by: '',
    created_at: 0,
    updated_at: 0,
  },
];

const sampleUsers = [
  {
    id: 'u1',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'member',
    avatar_url: '',
    created_at: 0,
    updated_at: 0,
    password_hash: '',
  },
  {
    id: 'u2',
    name: 'Bob',
    email: 'bob@example.com',
    role: 'member',
    avatar_url: '',
    created_at: 0,
    updated_at: 0,
    password_hash: '',
  },
];

function renderSearchFilters(filters?: SearchFilterState, onChange?: typeof vi.fn) {
  const onChangeFn = onChange ?? vi.fn();
  return {
    onChangeFn,
    ...render(<SearchFilters filters={filters ?? EMPTY_FILTERS} onChange={onChangeFn} />),
  };
}

describe('SearchFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCollections.mockResolvedValue(sampleCollections);
    mockListUsers.mockResolvedValue(sampleUsers);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the filter toggle button', async () => {
    renderSearchFilters();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('shows active filter badge when filters are active', () => {
    const filters: SearchFilterState = { ...EMPTY_FILTERS, collectionId: 'c1' };
    renderSearchFilters(filters);
    const badge = screen.getByText('1');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('rounded-full');
  });

  it('does not show badge when no filters active', () => {
    renderSearchFilters();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows aggregated badge count for multiple active filters', () => {
    const filters: SearchFilterState = {
      collectionId: 'c1',
      authorId: 'u1',
      dateFrom: '2026-01-01',
      dateTo: '',
      tags: '',
    };
    renderSearchFilters(filters);
    // collectionId + authorId + dateFrom = 3 active
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  // ─── Dropdown open/close ────────────────────────────────────────────────────

  it('opens filter panel on click', async () => {
    renderSearchFilters();
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Search filters')).toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('closes filter panel when clicking toggle again', async () => {
    renderSearchFilters();
    const btn = screen.getByText('Filters');
    fireEvent.click(btn);
    expect(screen.getByText('Search filters')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText('Search filters')).not.toBeInTheDocument();
  });

  it('closes filter panel on outside click', async () => {
    renderSearchFilters();
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Search filters')).toBeInTheDocument();
    // Click on document body (outside the panel)
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText('Search filters')).not.toBeInTheDocument();
    });
  });

  // ─── Data fetching ──────────────────────────────────────────────────────────

  it('fetches collections and users on mount', async () => {
    renderSearchFilters();
    expect(mockListCollections).toHaveBeenCalledOnce();
    expect(mockListUsers).toHaveBeenCalledOnce();
  });

  it('populates collection dropdown with fetched data', async () => {
    renderSearchFilters();
    fireEvent.click(screen.getByText('Filters'));
    const select = screen.getByDisplayValue('All collections');
    expect(select).toBeInTheDocument();
    // After the promise resolves, we should see options
    await waitFor(() => {
      expect(screen.getByText('⚙️ Engineering')).toBeInTheDocument();
      expect(screen.getByText('🎨 Design')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('All authors')).toBeInTheDocument();
  });

  it('populates author dropdown with fetched users', async () => {
    renderSearchFilters();
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('handles API fetch errors gracefully', async () => {
    mockListCollections.mockRejectedValue(new Error('Network error'));
    mockListUsers.mockRejectedValue(new Error('Network error'));
    renderSearchFilters();
    fireEvent.click(screen.getByText('Filters'));
    // Should still render dropdown with default option
    expect(screen.getByDisplayValue('All collections')).toBeInTheDocument();
  });

  // ─── Filter interaction ─────────────────────────────────────────────────────

  it('calls onChange when collection filter changes', async () => {
    const onChange = vi.fn();
    renderSearchFilters(undefined, onChange);
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => {
      expect(screen.getByText('⚙️ Engineering')).toBeInTheDocument();
    });
    const select = document.getElementById('filter-collection') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'c1' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ collectionId: 'c1' }));
  });

  it('calls onChange when author filter changes', async () => {
    const onChange = vi.fn();
    renderSearchFilters(undefined, onChange);
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    const select = document.getElementById('filter-author') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'u1' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ authorId: 'u1' }));
  });

  it('calls onChange when date filters change', async () => {
    const onChange = vi.fn();
    renderSearchFilters(undefined, onChange);
    fireEvent.click(screen.getByText('Filters'));
    const fromInput = screen.getByPlaceholderText('From');
    const toInput = screen.getByPlaceholderText('To');
    fireEvent.change(fromInput, { target: { value: '2026-06-01' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ dateFrom: '2026-06-01' }));
    fireEvent.change(toInput, { target: { value: '2026-06-28' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ dateTo: '2026-06-28' }));
  });

  it('calls onChange when tags input changes', async () => {
    const onChange = vi.fn();
    renderSearchFilters(undefined, onChange);
    fireEvent.click(screen.getByText('Filters'));
    const tagsInput = screen.getByPlaceholderText(/important/i);
    fireEvent.change(tagsInput, { target: { value: 'draft, meeting' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: 'draft, meeting' }));
  });

  // ─── Clear all ──────────────────────────────────────────────────────────────

  it("clears all filters when 'Clear all' is clicked", async () => {
    const onChange = vi.fn();
    const activeFilters: SearchFilterState = {
      collectionId: 'c1',
      authorId: 'u1',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-28',
      tags: 'draft',
    };
    renderSearchFilters(activeFilters, onChange);
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('Clear all'));
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  // ─── Filter chips (rendered based on props, not async) ──────────────────────

  it('shows filter chips for collection and author filters', async () => {
    const activeFilters: SearchFilterState = {
      ...EMPTY_FILTERS,
      collectionId: 'c1',
      authorId: 'u1',
    };
    // Pre-populate collections/users for chip resolution
    mockListCollections.mockResolvedValue(sampleCollections);
    mockListUsers.mockResolvedValue(sampleUsers);
    renderSearchFilters(activeFilters);
    fireEvent.click(screen.getByText('Filters'));
    // Chips are rendered once collections/users data loads from the async fetch.
    // "Engineering" appears only in the chip (not in select options since collections
    // use icon prefix), so it's a single match.
    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });
    // "Alice" appears in both the select options AND the filter chip.
    const aliceElements = screen.getAllByText('Alice');
    expect(aliceElements.length).toBeGreaterThanOrEqual(2);
  });

  it('removes collection filter chip when X is clicked', async () => {
    const onChange = vi.fn();
    const activeFilters: SearchFilterState = {
      ...EMPTY_FILTERS,
      collectionId: 'c1',
    };
    renderSearchFilters(activeFilters, onChange);
    fireEvent.click(screen.getByText('Filters'));
    const removeBtn = screen.getByLabelText('Remove collection filter');
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ collectionId: '' }));
  });

  // ─── Accessibility ──────────────────────────────────────────────────────────

  it('has no accessibility violations when closed', async () => {
    const { container } = renderSearchFilters();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when open with data', async () => {
    const { container } = renderSearchFilters();
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => {
      expect(screen.getByText('⚙️ Engineering')).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with active filters open', async () => {
    const activeFilters: SearchFilterState = {
      collectionId: 'c1',
      authorId: 'u1',
      dateFrom: '2026-06-01',
      dateTo: '',
      tags: 'draft',
    };
    const { container } = renderSearchFilters(activeFilters);
    fireEvent.click(screen.getByText('Filters'));
    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with active filters closed', async () => {
    const activeFilters: SearchFilterState = {
      collectionId: 'c1',
      authorId: 'u1',
      dateFrom: '',
      dateTo: '',
      tags: '',
    };
    const { container } = renderSearchFilters(activeFilters);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
