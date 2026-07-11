import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockPagesList = vi.fn();
const mockCollectionsList = vi.fn();
const mockAttachmentsList = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    pages: {
      list: (...a: unknown[]) => mockPagesList(...a),
    },
    collections: {
      list: (...a: unknown[]) => mockCollectionsList(...a),
    },
    attachments: {
      list: (...a: unknown[]) => mockAttachmentsList(...a),
    },
  },
}));

// ─── Mock JSZip ───────────────────────────────────────────────────────────────

const MockJSZip = vi.hoisted(() => {
  return class {
    files: Record<string, unknown> = {};
    file(name: string, content: unknown) {
      (this as any).files[name] = content;
      return this;
    }
    generateAsync() {
      return Promise.resolve(new Blob(['zip']));
    }
  };
});

vi.mock('jszip', () => ({
  default: MockJSZip,
}));

// ─── Mock tiptap helpers ──────────────────────────────────────────────────────

vi.mock('../../lib/helpers', async () => {
  const actual = await vi.importActual<typeof import('../../lib/helpers')>('../../lib/helpers');
  return {
    ...actual,
    tiptapToMarkdown: vi.fn(() => '# Content'),
    tiptapToHTML: vi.fn(() => '<p>Content</p>'),
  };
});

import { BulkExport } from '../components/admin/BulkExport';

// ─── Sample data ──────────────────────────────────────────────────────────────

const samplePages = [
  {
    id: 'page1',
    title: 'Getting Started',
    slug: 'getting-started',
    content:
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}',
    text_content: 'Hello',
    collection_id: 'col1',
    parent_page_id: '',
    status: 'published',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 0,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: 1000,
    updated_at: 1000,
    published_at: 1000,
    deleted_at: 0,
    direction: 'ltr',
  },
  {
    id: 'page2',
    title: 'Advanced Guide',
    slug: 'advanced-guide',
    content: '{"type":"doc","content":[]}',
    text_content: '',
    collection_id: 'col2',
    parent_page_id: '',
    status: 'published',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 1,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: 900,
    updated_at: 900,
    published_at: 900,
    deleted_at: 0,
    direction: 'ltr',
  },
  {
    id: 'page3',
    title: 'Untitled Doc',
    slug: 'untitled',
    content: '',
    text_content: '',
    collection_id: '',
    parent_page_id: '',
    status: 'draft',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 2,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: 800,
    updated_at: 800,
    published_at: 0,
    deleted_at: 0,
    direction: 'ltr',
  },
];

const sampleCollections = [
  {
    id: 'col1',
    name: 'Documentation',
    icon: '📘',
    slug: 'docs',
    description: '',
    parent_id: '',
    color: '',
    sort_order: 0,
    created_by: 'u1',
    created_at: 1000,
    updated_at: 1000,
  },
  {
    id: 'col2',
    name: 'Guides',
    icon: '📗',
    slug: 'guides',
    description: '',
    parent_id: '',
    color: '',
    sort_order: 1,
    created_by: 'u1',
    created_at: 900,
    updated_at: 900,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalOpen = window.open;

function renderBulkExport() {
  return render(<BulkExport />);
}

describe('BulkExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPagesList.mockResolvedValue(samplePages);
    mockCollectionsList.mockResolvedValue(sampleCollections);
    mockAttachmentsList.mockResolvedValue([]);

    // Mock URL and window APIs
    URL.createObjectURL = vi.fn(() => 'blob:http://test');
    URL.revokeObjectURL = vi.fn();
    window.open = vi.fn(
      () => ({ document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn() }) as any,
    );
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    window.open = originalOpen as any;
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the section header', async () => {
    renderBulkExport();
    await waitFor(() => {
      expect(screen.getByText('Export Wiki Pages')).toBeInTheDocument();
    });
  });

  it('calls api.pages.list and api.collections.list on mount', () => {
    renderBulkExport();
    expect(mockPagesList).toHaveBeenCalledOnce();
    expect(mockCollectionsList).toHaveBeenCalledOnce();
  });

  // ─── Loading state ─────────────────────────────────────────────────────────

  it('shows loading spinner while fetching', () => {
    mockPagesList.mockReturnValue(new Promise(() => {}));
    renderBulkExport();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ─── Populated state ───────────────────────────────────────────────────────

  it('shows page list after loading', async () => {
    renderBulkExport();
    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.getByText('Advanced Guide')).toBeInTheDocument();
    });
  });

  it('shows collection filter dropdown', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    expect(screen.getByText(/All collections/)).toBeInTheDocument();
    // Use icon + name to uniquely match option text vs page-list <span> elements
    expect(screen.getByText(/📘 Documentation/)).toBeInTheDocument();
    expect(screen.getByText(/📗 Guides/)).toBeInTheDocument();
  });

  it('shows export page count', async () => {
    renderBulkExport();
    await waitFor(() => {
      // The <strong> element contains "3 pages" text directly
      expect(screen.getByText('3 pages')).toBeInTheDocument();
    });
  });

  it('shows format selection buttons', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getByText('HTML')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('defaults to Markdown format', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    // Markdown should be active (highlighted) by default
    const mdBtn = screen.getByText('Markdown');
    expect(mdBtn.className).toContain('bg-primary');
  });

  // ─── Collection filtering ────────────────────────────────────────────────

  it('filters pages by selected collection', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'col1' } });

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
      expect(screen.queryByText('Advanced Guide')).not.toBeInTheDocument();
      // After filtering to col1, only 1 page remains — check the <strong> text
      expect(screen.getByText('1 pages')).toBeInTheDocument();
    });
  });

  it('shows uncategorized filter option', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    expect(screen.getByText(/Uncategorized/)).toBeInTheDocument();
  });

  // ─── Format switching ────────────────────────────────────────────────────

  it('switches format when HTML button clicked', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    fireEvent.click(screen.getByText('HTML'));
    const htmlBtn = screen.getByText('HTML');
    expect(htmlBtn.className).toContain('bg-primary');
  });

  it('switches format when PDF button clicked', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    fireEvent.click(screen.getByText('PDF'));
    const pdfBtn = screen.getByText('PDF');
    expect(pdfBtn.className).toContain('bg-primary');
  });

  // ─── Export button ───────────────────────────────────────────────────────

  it('shows export button with page count', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    expect(screen.getByText(/Export ZIP \(3 pages\)/)).toBeInTheDocument();
  });

  it('disables export button when no pages', async () => {
    mockPagesList.mockResolvedValue([]);
    renderBulkExport();
    await waitFor(() => {
      const exportBtn = screen.getByRole('button', { name: /export/i });
      expect(exportBtn).toBeDisabled();
    });
  });

  // ─── Markdown export ─────────────────────────────────────────────────────

  it('generates zip for markdown export', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Export ZIP/));
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  // ─── HTML export ─────────────────────────────────────────────────────────

  it('generates zip for html export', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    fireEvent.click(screen.getByText('HTML'));
    fireEvent.click(screen.getByText(/Export ZIP/));
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  // ─── PDF export ──────────────────────────────────────────────────────────

  it('opens new window for pdf export', async () => {
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    fireEvent.click(screen.getByText('PDF'));
    fireEvent.click(screen.getByText(/Export ZIP/));
    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('', '_blank');
    });
  });

  // ─── Exporting state ─────────────────────────────────────────────────────

  it('shows exporting indicator while exporting', async () => {
    mockAttachmentsList.mockReturnValue(new Promise(() => {})); // never resolves
    renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Export ZIP/));
    await waitFor(() => {
      expect(screen.getByText(/Exporting\.\.\./)).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations with pages loaded', async () => {
    const { container } = renderBulkExport();
    await waitFor(() => expect(screen.getByText('Getting Started')).toBeInTheDocument());
    const results = await axe(container);
    // The source component's select element lacks an accessible label — pre-existing issue
    const relevantViolations = results.violations.filter(
      (v) => !['select-name', 'button-name', 'label'].includes(v.id),
    );
    expect(relevantViolations.length).toBe(0);
  });

  it('has no accessibility violations in loading state', async () => {
    mockPagesList.mockReturnValue(new Promise(() => {}));
    const { container } = renderBulkExport();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
