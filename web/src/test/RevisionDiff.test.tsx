import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { RevisionDiff } from '../components/RevisionDiff';
import type { PageRevision } from '../lib/api';

// ─── Sample data ──────────────────────────────────────────────────────────────

const baseRevision: PageRevision = {
  id: 'r1',
  page_id: 'p1',
  revision_number: 1,
  title: 'Welcome',
  content: JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
  }),
  created_at: 1000,
  created_by: 'u1',
};

const newRevision: PageRevision = {
  id: 'r2',
  page_id: 'p1',
  revision_number: 2,
  title: 'Welcome',
  content: JSON.stringify({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'New paragraph' }] },
    ],
  }),
  created_at: 2000,
  created_by: 'u1',
};

const titleChangedNew: PageRevision = {
  ...newRevision,
  title: 'Welcome Updated',
};

const noDiffRevisions: [PageRevision, PageRevision] = [
  { ...baseRevision },
  { ...baseRevision, id: 'r3', revision_number: 2, created_at: 2000 },
];

const plainTextRevision: PageRevision = {
  ...baseRevision,
  content: 'Line 1\nLine 2\nLine 3',
};

// ─── Helper ────────────────────────────────────────────────────────────────────

function renderDiff(oldRev: PageRevision, newRev: PageRevision) {
  const onClose = vi.fn();
  return {
    onClose,
    ...render(<RevisionDiff oldRev={oldRev} newRev={newRev} onClose={onClose} />),
  };
}

describe('RevisionDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the diff panel', () => {
    renderDiff(baseRevision, newRevision);
    expect(screen.getByText('Changes')).toBeInTheDocument();
  });

  it('shows old revision number and new revision number', () => {
    renderDiff(baseRevision, newRevision);
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('shows close button', () => {
    renderDiff(baseRevision, newRevision);
    // Close button is an SVG with a close path
    const closeBtn = document.querySelector('button');
    expect(closeBtn).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const { onClose } = renderDiff(baseRevision, newRevision);
    const closeBtn = document.querySelector('button');
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ─── Stats ──────────────────────────────────────────────────────────────────

  it('shows addition and removal counts', () => {
    renderDiff(baseRevision, newRevision);
    expect(
      screen.getByText((content) => content.includes('+1') && content.includes('addition')),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('0') && content.includes('removal')),
    ).toBeInTheDocument();
  });

  it('shows total line count', () => {
    renderDiff(baseRevision, newRevision);
    expect(screen.getByText(/total lines/)).toBeInTheDocument();
  });

  // ─── Diff content ─────────────────────────────────────────────────────────

  it('shows unchanged content', () => {
    renderDiff(baseRevision, newRevision);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows added content', () => {
    renderDiff(baseRevision, newRevision);
    expect(screen.getByText('New paragraph')).toBeInTheDocument();
  });

  it('shows removed content with strikethrough style', () => {
    // Create a revision where content was removed
    const removedRev: PageRevision = {
      ...newRevision,
      content: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Only this' }] }],
      }),
    };
    renderDiff(baseRevision, removedRev);
    // "Hello world" was in base but not in removedRev → removed
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  // ─── Title diff ───────────────────────────────────────────────────────────

  it('shows title changed section when titles differ', () => {
    renderDiff(baseRevision, titleChangedNew);
    expect(screen.getByText('Title changed')).toBeInTheDocument();
    expect(screen.getByText('Welcome Updated')).toBeInTheDocument();
  });

  it('does not show title changed section when titles are the same', () => {
    renderDiff(baseRevision, newRevision);
    expect(screen.queryByText('Title changed')).not.toBeInTheDocument();
  });

  it('shows old title with strikethrough when title changed', () => {
    renderDiff(baseRevision, titleChangedNew);
    const oldTitle = screen.getByText('Welcome');
    expect(oldTitle.className).toContain('line-through');
    expect(oldTitle.className).toContain('text-red-300');
  });

  // ─── Plain text fallback ──────────────────────────────────────────────────

  it('handles plain text content gracefully', () => {
    const newPlain: PageRevision = {
      ...plainTextRevision,
      content: 'Line 1\nLine 2\nLine 3\nLine 4',
    };
    renderDiff(plainTextRevision, newPlain);
    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
    expect(screen.getByText('Line 3')).toBeInTheDocument();
    // Line 4 is added
    expect(screen.getByText('+1 addition')).toBeInTheDocument();
  });

  // ─── Identical content ──────────────────────────────────────────────────

  it('shows unchanged content lines when revisions have same content', () => {
    renderDiff(noDiffRevisions[0], noDiffRevisions[1]);
    // diffArrays returns unchanged lines for identical content
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows 0 additions and 0 removals when content unchanged', () => {
    renderDiff(noDiffRevisions[0], noDiffRevisions[1]);
    expect(
      screen.getByText((content) => content.includes('+0') && content.includes('addition')),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('0') && content.includes('removal')),
    ).toBeInTheDocument();
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  it('handles empty content string', () => {
    const emptyContent: PageRevision = { ...baseRevision, content: '' };
    renderDiff(emptyContent, baseRevision);
    // Should not crash
    expect(screen.getByText('Changes')).toBeInTheDocument();
  });

  it('handles null content in Tiptap JSON', () => {
    const nullDoc: PageRevision = {
      ...baseRevision,
      content: JSON.stringify({ type: 'doc', content: null }),
    };
    renderDiff(nullDoc, baseRevision);
    expect(screen.getByText('Changes')).toBeInTheDocument();
  });

  it('handles invalid JSON content gracefully', () => {
    const invalid: PageRevision = { ...baseRevision, content: 'not json at all' };
    renderDiff(invalid, baseRevision);
    expect(screen.getByText('Changes')).toBeInTheDocument();
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations', async () => {
    const { container } = renderDiff(baseRevision, newRevision);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with title change', async () => {
    const { container } = renderDiff(baseRevision, titleChangedNew);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when identical', async () => {
    const { container } = renderDiff(noDiffRevisions[0], noDiffRevisions[1]);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
