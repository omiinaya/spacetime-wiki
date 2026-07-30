import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const mockGetPage = vi.hoisted(() => vi.fn());
const mockListPages = vi.hoisted(() => vi.fn());
const mockUpdatePage = vi.hoisted(() => vi.fn());
const mockSetStatus = vi.hoisted(() => vi.fn());
const mockDeletePage = vi.hoisted(() => vi.fn());
const mockDuplicatePage = vi.hoisted(() => vi.fn());
const mockSetPinned = vi.hoisted(() => vi.fn());
const mockSetColor = vi.hoisted(() => vi.fn());
const mockSetFullWidth = vi.hoisted(() => vi.fn());
const mockSetIcon = vi.hoisted(() => vi.fn());
const mockMovePage = vi.hoisted(() => vi.fn());
const mockMarkAsTemplate = vi.hoisted(() => vi.fn());

const mockGetCollection = vi.hoisted(() => vi.fn());
const mockListCollections = vi.hoisted(() => vi.fn());

const mockListRevisions = vi.hoisted(() => vi.fn());
const mockListComments = vi.hoisted(() => vi.fn());
const mockAddComment = vi.hoisted(() => vi.fn());
const mockResolveComment = vi.hoisted(() => vi.fn());
const mockDeleteComment = vi.hoisted(() => vi.fn());
const mockListReactions = vi.hoisted(() => vi.fn());
const mockAddReaction = vi.hoisted(() => vi.fn());

const mockToggleFavorite = vi.hoisted(() => vi.fn());
const mockToggleWatch = vi.hoisted(() => vi.fn());

const mockListAttachments = vi.hoisted(() => vi.fn());
const mockAddAttachment = vi.hoisted(() => vi.fn());
const mockDeleteAttachment = vi.hoisted(() => vi.fn());

const mockListTags = vi.hoisted(() => vi.fn());

const mockRecordView = vi.hoisted(() => vi.fn());
const mockGetViewCount = vi.hoisted(() => vi.fn());

const mockListShareLinks = vi.hoisted(() => vi.fn());
const mockCreateShareLink = vi.hoisted(() => vi.fn());
const mockDeleteShareLink = vi.hoisted(() => vi.fn());

const mockAccessRequestCreate = vi.hoisted(() => vi.fn());
const mockResolveContentAttachments = vi.hoisted(
  () => async (content: unknown, cache: unknown) => content,
);
const mockResolveTransclusions = vi.hoisted(() => async (content: unknown) => content);

// ─── Mock the API module (hoisted to top by Vitest) ───────────────────────────

vi.mock('../lib/api', () => ({
  api: {
    pages: {
      get: mockGetPage,
      list: mockListPages,
      update: mockUpdatePage,
      setStatus: mockSetStatus,
      delete: mockDeletePage,
      duplicate: mockDuplicatePage,
      setPinned: mockSetPinned,
      setColor: mockSetColor,
      setFullWidth: mockSetFullWidth,
      setIcon: mockSetIcon,
      move: mockMovePage,
      markAsTemplate: mockMarkAsTemplate,
    },
    collections: {
      get: mockGetCollection,
      list: mockListCollections,
    },
    revisions: {
      list: mockListRevisions,
    },
    comments: {
      list: mockListComments,
      add: mockAddComment,
      resolve: mockResolveComment,
      delete: mockDeleteComment,
      listReactions: mockListReactions,
      addReaction: mockAddReaction,
    },
    favorites: {
      toggle: mockToggleFavorite,
    },
    watch: {
      toggle: mockToggleWatch,
    },
    attachments: {
      list: mockListAttachments,
      add: mockAddAttachment,
      delete: mockDeleteAttachment,
    },
    tags: {
      list: mockListTags,
    },
    analytics: {
      recordView: mockRecordView,
      getViewCount: mockGetViewCount,
    },
    shareLinks: {
      list: mockListShareLinks,
      create: mockCreateShareLink,
      delete: mockDeleteShareLink,
    },
    users: {
      list: () => Promise.resolve([]),
    },
  },
  resolveContentAttachments: mockResolveContentAttachments,
  resolveTransclusions: mockResolveTransclusions,
  accessRequestApi: {
    create: mockAccessRequestCreate,
  },
  Page: class {},
  PageRevision: class {},
  Comment: class {},
  Collection: class {},
}));

// ─── Import after mock ────────────────────────────────────────────────────────

import { PageView } from '../pages/PageView';

// ─── Sample data ──────────────────────────────────────────────────────────────

const samplePage = {
  id: 'p1',
  title: 'Test Page',
  slug: 'test-page',
  content: JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
  }),
  text_content: 'Hello world',
  collection_id: 'c1',
  parent_page_id: '',
  status: 'published',
  icon: '📄',
  color: '',
  full_width: false,
  is_pinned: false,
  is_template: false,
  template_id: '',
  sort_order: 0,
  created_by: 'u1',
  updated_by: 'u1',
  created_at: 1700000000,
  updated_at: 1700001000,
  published_at: 1700000000,
  deleted_at: 0,
  direction: 'ltr',
};

const sampleCollection = {
  id: 'c1',
  name: 'Test Collection',
  slug: 'test-collection',
  description: 'A test collection',
  parent_id: '',
  icon: '📁',
  color: '',
  sort_order: 0,
  created_by: 'u1',
  created_at: 1700000000,
  updated_at: 1700000000,
};

const sampleRevisions = [
  {
    id: 'r1',
    page_id: 'p1',
    title: 'Test Page',
    content: '{}',
    edited_by: 'u1',
    created_at: 1700000000,
    revision_number: 1,
  },
  {
    id: 'r2',
    page_id: 'p1',
    title: 'Test Page',
    content: '{}',
    edited_by: 'u1',
    created_at: 1700001000,
    revision_number: 2,
  },
];

const sampleComments = [
  {
    id: 'c1',
    page_id: 'p1',
    parent_comment_id: '',
    user_id: 'u2',
    body: 'Great page!',
    text_anchor: '',
    is_resolved: false,
    created_at: 1700000500,
    updated_at: 1700000500,
  },
];

const sampleAttachments: Array<{ id: string; name: string; path: string; url: string }> = [];

function renderPageView({ pageId = 'p1', userId = 'u1' } = {}) {
  return render(
    <MemoryRouter>
      <PageView pageId={pageId} userId={userId} />
    </MemoryRouter>,
  );
}

describe('PageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPage.mockResolvedValue(samplePage);
    mockListPages.mockResolvedValue([samplePage]);
    mockGetCollection.mockResolvedValue(sampleCollection);
    mockListRevisions.mockResolvedValue(sampleRevisions);
    mockListComments.mockResolvedValue(sampleComments);
    mockListReactions.mockResolvedValue([]);
    mockListAttachments.mockResolvedValue(sampleAttachments);
    mockListTags.mockResolvedValue([]);
    mockGetViewCount.mockResolvedValue(42);
    mockRecordView.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Loading state ─────────────────────────────────────────────────────────

  it('shows loading spinner while fetching page data', () => {
    mockGetPage.mockReturnValue(new Promise(() => {}));
    renderPageView();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ─── Error / Not found state ───────────────────────────────────────────────

  it('shows error message when page fetch fails', async () => {
    mockGetPage.mockRejectedValue(new Error('Network error'));
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Go home/)).toBeInTheDocument();
  });

  it("shows 'Page not found' when page is null", async () => {
    mockGetPage.mockResolvedValue(null);
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText(/Page not found/)).toBeInTheDocument();
    });
  });

  it('shows Request Access button when user is logged in and page not found', async () => {
    mockGetPage.mockResolvedValue(null);
    renderPageView({ userId: 'u1' });
    await waitFor(() => {
      expect(screen.getByText('Request Access')).toBeInTheDocument();
    });
  });

  it('hides Request Access button when user is anonymous and page not found', async () => {
    mockGetPage.mockResolvedValue(null);
    renderPageView({ userId: null });
    await waitFor(() => {
      expect(screen.getByText(/Page not found/)).toBeInTheDocument();
    });
    expect(screen.queryByText('Request Access')).not.toBeInTheDocument();
  });

  // ─── Loaded state — basic render ──────────────────────────────────────────

  it('renders the page title', async () => {
    renderPageView();
    await waitFor(() => {
      const titles = screen.getAllByText('Test Page');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders the page icon', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('📄')).toBeInTheDocument();
    });
  });

  it('shows Published status badge for published pages', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('Published')).toBeInTheDocument();
    });
  });

  it('shows Draft status badge for draft pages', async () => {
    mockGetPage.mockResolvedValue({ ...samplePage, status: 'draft' });
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  it('shows Archived status badge for archived pages', async () => {
    mockGetPage.mockResolvedValue({ ...samplePage, status: 'archived' });
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  it('shows view count', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('renders breadcrumbs with collection name', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText(/Test Collection/)).toBeInTheDocument();
    });
  });

  it('calls api.pages.get with the correct pageId', async () => {
    renderPageView({ pageId: 'p42' });
    await waitFor(() => {
      expect(mockGetPage).toHaveBeenCalledWith('p42');
    });
  });

  it('calls api.analytics.recordView and getViewCount', async () => {
    renderPageView();
    await waitFor(() => {
      expect(mockRecordView).toHaveBeenCalled();
      expect(mockGetViewCount).toHaveBeenCalledWith('p1');
    });
  });

  // ─── Loaded state — header actions ────────────────────────────────────────

  it('has an Edit button that navigates to edit page', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('Edit')).toBeInTheDocument();
    });
  });

  it('has a Favorite button', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('Favorite')).toBeInTheDocument();
    });
  });

  it('has a History button', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('History')).toBeInTheDocument();
    });
  });

  it('has a Share button', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('Share')).toBeInTheDocument();
    });
  });

  it('shows Publish button when page is draft', async () => {
    mockGetPage.mockResolvedValue({ ...samplePage, status: 'draft' });
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('Publish')).toBeInTheDocument();
    });
  });

  it('shows Archive button when page is published', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('Archive')).toBeInTheDocument();
    });
  });

  it('shows Restore and Delete buttons when page is archived', async () => {
    mockGetPage.mockResolvedValue({ ...samplePage, status: 'archived' });
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('Restore')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  // ─── Comments section ──────────────────────────────────────────────────────

  it('shows comments section with comment count', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText(/Comments \(1\)/)).toBeInTheDocument();
    });
  });

  it('renders comment body text', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('Great page!')).toBeInTheDocument();
    });
  });

  it("shows 'No comments yet' when there are no comments", async () => {
    mockListComments.mockResolvedValue([]);
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
    });
  });

  it('shows comment input when user is logged in', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Add a comment/)).toBeInTheDocument();
    });
  });

  it('hides comment input when user is anonymous', async () => {
    renderPageView({ userId: null });
    await waitFor(() => {
      expect(screen.getByText(/Comments \(1\)/)).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText(/Add a comment/)).not.toBeInTheDocument();
  });

  // ─── Export dropdown ───────────────────────────────────────────────────────

  it('shows export dropdown when export button clicked', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('Export')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Export'));
    expect(screen.getByText('Export as Markdown')).toBeInTheDocument();
    expect(screen.getByText('Export as HTML')).toBeInTheDocument();
    expect(screen.getByText('Export as PDF (print)')).toBeInTheDocument();
    expect(screen.getByText('Export as ZIP')).toBeInTheDocument();
    expect(screen.getByText('Export as JSON')).toBeInTheDocument();
  });

  // ─── Share dialog ──────────────────────────────────────────────────────────

  it('shows share dialog when Share button clicked', async () => {
    mockListShareLinks.mockResolvedValue([]);
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('Share')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Share'));
    await waitFor(() => {
      expect(screen.getByText(/Share.*Test Page/)).toBeInTheDocument();
    });
    expect(screen.getByText('Create share link')).toBeInTheDocument();
  });

  it('calls shareLinks.list when share dialog opens', async () => {
    mockListShareLinks.mockResolvedValue([]);
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('Share')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Share'));
    await waitFor(() => {
      expect(mockListShareLinks).toHaveBeenCalledWith('p1');
    });
  });

  // ─── TOC side panel ────────────────────────────────────────────────────────

  it('opens TOC panel when TOC button clicked', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('Table of Contents')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Table of Contents'));
    expect(screen.getByText('Table of Contents')).toBeInTheDocument();
  });

  // ─── Color picker ─────────────────────────────────────────────────────────

  it('shows color picker when palette button clicked', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('Page color')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('Page color'));
    const colorSwatch = screen.getByTitle('#ef4444');
    expect(colorSwatch).toBeInTheDocument();
  });

  // ─── Attachment section ────────────────────────────────────────────────────

  it('shows attachments section heading', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText(/Attachments \(0\)/)).toBeInTheDocument();
    });
  });

  it('shows upload button when user is logged in', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText('Upload file')).toBeInTheDocument();
      expect(screen.getByText('Browse media')).toBeInTheDocument();
    });
  });

  it('hides upload button when user is anonymous', async () => {
    renderPageView({ userId: null });
    await waitFor(() => {
      expect(screen.getByText(/Attachments \(0\)/)).toBeInTheDocument();
    });
    expect(screen.queryByText('Upload file')).not.toBeInTheDocument();
  });

  // ─── Word count / reading time ─────────────────────────────────────────────

  it('shows word count and reading time', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByText(/words/)).toBeInTheDocument();
      expect(screen.getByText(/min read/)).toBeInTheDocument();
    });
  });

  // ─── Revisions panel ──────────────────────────────────────────────────────

  it('opens revisions history panel when History button clicked', async () => {
    renderPageView();
    await waitFor(() => {
      expect(screen.getByTitle('History')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTitle('History'));
    await waitFor(() => {
      expect(screen.getByText(/History \(2\)/)).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations in loaded state', async () => {
    const { container } = renderPageView();
    await waitFor(() => {
      const titles = screen.getAllByText('Test Page');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in error state', async () => {
    mockGetPage.mockRejectedValue(new Error('Network error'));
    const { container } = renderPageView();
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
