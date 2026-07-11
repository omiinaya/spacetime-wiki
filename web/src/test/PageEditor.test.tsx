import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const mockCreatePage = vi.hoisted(() => vi.fn());
const mockUpdatePage = vi.hoisted(() => vi.fn());
const mockGetPage = vi.hoisted(() => vi.fn());
const mockListPages = vi.hoisted(() => vi.fn());
const mockSetStatus = vi.hoisted(() => vi.fn());
const mockDeletePage = vi.hoisted(() => vi.fn());
const mockDuplicatePage = vi.hoisted(() => vi.fn());
const mockSetPinned = vi.hoisted(() => vi.fn());
const mockSetColor = vi.hoisted(() => vi.fn());
const mockSetFullWidth = vi.hoisted(() => vi.fn());
const mockSetIcon = vi.hoisted(() => vi.fn());
const mockMovePage = vi.hoisted(() => vi.fn());
const mockMarkAsTemplate = vi.hoisted(() => vi.fn());
const mockSetDirection = vi.hoisted(() => vi.fn());

const mockListTags = vi.hoisted(() => vi.fn());
const mockAddTag = vi.hoisted(() => vi.fn());
const mockRemoveTag = vi.hoisted(() => vi.fn());

const mockAddAttachment = vi.hoisted(() => vi.fn());

const mockNavigate = vi.hoisted(() => vi.fn());

// ─── Full editor mock ─────────────────────────────────────────────────────────

// The real PageEditor calls editor.on(), editor.off(), editor.setEditable(),
// editor.getJSON(), editor.isActive(), editor.chain(), etc.
// We build a comprehensive mock that supports all these.

function buildMockEditor() {
  const chain: any = {};
  // Every chainable method returns the chain object for chaining
  chain.focus = () => chain;
  const run = vi.fn();
  const formattingCmds = [
    'toggleBold',
    'toggleItalic',
    'toggleUnderline',
    'toggleStrike',
    'toggleHighlight',
    'toggleCode',
    'toggleBlockquote',
    'toggleCodeBlock',
    'toggleDetails',
    'setHorizontalRule',
    'setDetails',
    'toggleTaskList',
    'insertTable',
    'setLink',
    'setImageEnhanced',
    'insertContent',
    'deleteRange',
    'setContent',
  ];
  const headingCmds = ['toggleHeading'];
  const listCmds = ['toggleBulletList', 'toggleOrderedList', 'toggleTaskList'];
  const specialCmds = [
    'setMermaid',
    'setMathBlock',
    'setVideoEmbed',
    'setRichEmbed',
    'setDrawio',
    'setPlantUML',
    'setDatabaseBase',
    'insertSyncedBlock',
    'toggleCallout',
  ];
  for (const cmd of [...formattingCmds, ...headingCmds, ...listCmds, ...specialCmds]) {
    chain[cmd] = () => chain;
  }
  chain.run = run;

  const eventHandlers: Record<string, Set<(...args: any[]) => void>> = {};

  const editor: any = {
    chain: vi.fn(() => chain),
    isActive: vi.fn(() => false),
    isEditable: true,
    getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    getText: vi.fn(() => ''),
    commands: { setContent: vi.fn() },
    state: {
      selection: { from: 0 },
      doc: {
        resolve: vi.fn(() => ({ start: () => 0 })),
        textBetween: vi.fn(() => ''),
      },
    },
    view: {
      dom: document.createElement('div'),
      dispatch: vi.fn(),
    },
    destroy: vi.fn(),
    setEditable: vi.fn((editable: boolean) => {
      editor.isEditable = editable;
    }),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = new Set();
      eventHandlers[event].add(handler);
    }),
    off: vi.fn((event: string, handler: (...args: any[]) => void) => {
      eventHandlers[event]?.delete(handler);
    }),
    _trigger: (event: string, ...args: any[]) => {
      eventHandlers[event]?.forEach((h) => h(...args));
    },
  };
  return editor;
}

const mockEditor = buildMockEditor();

const mockUseEditor = vi.hoisted(() => vi.fn(() => mockEditor));

const mockUseCollaboration = vi.hoisted(() =>
  vi.fn(() => ({
    ydoc: { on: vi.fn(), off: vi.fn(), destroy: vi.fn() },
    provider: { connect: vi.fn(), disconnect: vi.fn(), destroy: vi.fn() },
    collaborationExtension: { configure: vi.fn() },
    collaborationCursorExtension: { configure: vi.fn() },
    remoteUsers: [],
    isActive: false,
  })),
);

const mockUseParams = vi.hoisted(() => vi.fn());
const mockUseNavigate = vi.hoisted(() => vi.fn(() => mockNavigate));

// ─── Mock modules (hoisted) ───────────────────────────────────────────────────

vi.mock('../lib/api', () => ({
  api: {
    pages: {
      create: mockCreatePage,
      update: mockUpdatePage,
      get: mockGetPage,
      list: mockListPages,
      setStatus: mockSetStatus,
      delete: mockDeletePage,
      duplicate: mockDuplicatePage,
      setPinned: mockSetPinned,
      setColor: mockSetColor,
      setFullWidth: mockSetFullWidth,
      setIcon: mockSetIcon,
      move: mockMovePage,
      markAsTemplate: mockMarkAsTemplate,
      setDirection: mockSetDirection,
    },
    tags: {
      list: mockListTags,
      add: mockAddTag,
      remove: mockRemoveTag,
    },
    attachments: {
      add: mockAddAttachment,
    },
  },
  readFileAsBase64: vi.fn(() => Promise.resolve('base64data')),
  MAX_IMAGE_BYTES: 10 * 1024 * 1024,
  resolveContentAttachments: vi.fn((content: any) => Promise.resolve(content)),
  isAttachmentUrl: vi.fn(() => false),
  Page: class {},
}));

vi.mock('@tiptap/react', () => ({
  useEditor: mockUseEditor,
  EditorContent: ({ editor }: any) => {
    if (!editor) return null;
    return React.createElement('div', { 'data-testid': 'editor-content' });
  },
}));

vi.mock('../lib/useCollaboration', () => ({
  useCollaboration: mockUseCollaboration,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: mockUseParams,
    useNavigate: mockUseNavigate,
  };
});

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PageEditor } from '../pages/PageEditor';

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

const sampleDraftPage = {
  ...samplePage,
  id: 'p2',
  title: 'Draft Page',
  status: 'draft',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderEditor(props: { userId?: string | null } = {}) {
  return render(
    <MemoryRouter>
      <PageEditor userId={props.userId ?? 'u1'} />
    </MemoryRouter>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PageEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockListPages.mockResolvedValue([]);
    mockListTags.mockResolvedValue([]);
    mockGetPage.mockResolvedValue(null);
    mockUseEditor.mockReturnValue(mockEditor);
    // Reset editor mock methods
    mockEditor.setEditable.mockClear();
    mockEditor.chain.mockClear();
    mockEditor.on.mockClear();
    mockEditor.off.mockClear();
    mockEditor.getJSON.mockClear();
    mockEditor.isActive.mockClear();
    mockEditor.destroy.mockClear();
    // Reset chain
    mockEditor.chain.mockReturnValue(mockEditor.chain());
    // Default: new page mode (no id)
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows a spinner while loading an existing page', () => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockImplementation(() => new Promise(() => {})); // never resolves
      mockListTags.mockResolvedValue([]);
      renderEditor();
      // The loader SVG has aria-hidden="true", so check for the wrapping container
      const loaderContainer = document.querySelector('.flex.items-center.justify-center.h-64');
      expect(loaderContainer).toBeTruthy();
      expect(loaderContainer?.querySelector('.animate-spin')).toBeTruthy();
    });

    it('has no accessibility violations in loading state', async () => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockImplementation(() => new Promise(() => {}));
      mockListTags.mockResolvedValue([]);
      const { container } = renderEditor();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ─── New page mode ────────────────────────────────────────────────────────

  describe('new page mode', () => {
    it('renders the editor for a new page', () => {
      renderEditor();
      expect(screen.getByPlaceholderText('Untitled')).toBeInTheDocument();
      expect(screen.getByText('New page')).toBeInTheDocument();
    });

    it('shows Save button', () => {
      renderEditor();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('does not show Publish/Archive/Duplicate/Delete for new page', () => {
      renderEditor();
      expect(screen.queryByText('Publish')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Duplicate')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Archive')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
    });

    it('saves a new page on Save click and navigates to it', async () => {
      mockCreatePage.mockResolvedValue('new-page-id');
      renderEditor();

      const titleInput = screen.getByPlaceholderText('Untitled');
      fireEvent.change(titleInput, { target: { value: 'My New Page' } });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockCreatePage).toHaveBeenCalledWith(
          'My New Page',
          expect.any(String),
          '',
          '',
          'u1',
        );
      });
      expect(mockNavigate).toHaveBeenCalledWith('/page/new-page-id');
    });

    it('does not save if title is empty', async () => {
      renderEditor();
      fireEvent.click(screen.getByText('Save'));

      // Should not call create since title is empty
      await waitFor(() => {
        expect(mockCreatePage).not.toHaveBeenCalled();
      });
    });

    it('shows an error banner if save fails', async () => {
      mockCreatePage.mockRejectedValue(new Error('Network error'));
      renderEditor();

      const titleInput = screen.getByPlaceholderText('Untitled');
      fireEvent.change(titleInput, { target: { value: 'My Page' } });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockCreatePage).toHaveBeenCalled();
      });
      // Error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('has no accessibility violations in new page mode', async () => {
      const { container } = renderEditor();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ─── Existing page mode ───────────────────────────────────────────────────

  describe('existing page mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockResolvedValue(samplePage);
      mockListTags.mockResolvedValue([]);
    });

    it('loads and displays an existing page title', async () => {
      renderEditor();
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });
    });

    it('shows action buttons for existing page', async () => {
      renderEditor();
      await waitFor(() => {
        expect(screen.getByTitle('Duplicate')).toBeInTheDocument();
        expect(screen.getByTitle('Archive')).toBeInTheDocument();
        expect(screen.getByTitle('Delete')).toBeInTheDocument();
        expect(screen.getByText('Save')).toBeInTheDocument();
      });
    });

    it('shows editing indicator', async () => {
      renderEditor();
      await waitFor(() => {
        expect(screen.getByText('Editing')).toBeInTheDocument();
      });
    });

    it('shows no loading spinner after page loads', async () => {
      renderEditor();
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('updates page on Save click', async () => {
      mockUpdatePage.mockResolvedValue(undefined);
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(mockUpdatePage).toHaveBeenCalledWith('p1', 'Test Page', expect.any(String), 'u1');
      });
    });

    it('shows error banner on save failure', async () => {
      mockUpdatePage.mockRejectedValue(new Error('Save failed'));
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(screen.getByText(/Save failed/)).toBeInTheDocument();
      });
    });

    it('publishes a draft page', async () => {
      mockUseParams.mockReturnValue({ id: 'p2' });
      mockGetPage.mockResolvedValue(sampleDraftPage);
      mockSetStatus.mockResolvedValue(undefined);
      mockListTags.mockResolvedValue([]);

      renderEditor();

      await waitFor(() => {
        expect(screen.getByText('Publish')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Publish'));

      await waitFor(() => {
        expect(mockSetStatus).toHaveBeenCalledWith('p2', 'published');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/page/p2');
    });

    it('archives a page', async () => {
      mockSetStatus.mockResolvedValue(undefined);
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Archive'));

      await waitFor(() => {
        expect(mockSetStatus).toHaveBeenCalledWith('p1', 'archived');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('deletes a page after confirmation', async () => {
      window.confirm = vi.fn(() => true);
      mockDeletePage.mockResolvedValue(undefined);
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete'));

      await waitFor(() => {
        expect(mockDeletePage).toHaveBeenCalledWith('p1');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('does not delete if confirmation is cancelled', async () => {
      window.confirm = vi.fn(() => false);
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Delete'));
      expect(mockDeletePage).not.toHaveBeenCalled();
    });

    it('duplicates a page', async () => {
      mockDuplicatePage.mockResolvedValue('new-page-id');
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Duplicate'));

      await waitFor(() => {
        expect(mockDuplicatePage).toHaveBeenCalledWith('p1', 'u1');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/page/new-page-id/edit');
    });

    it('shows the Draft badge for draft pages', async () => {
      mockUseParams.mockReturnValue({ id: 'p2' });
      mockGetPage.mockResolvedValue(sampleDraftPage);
      mockListTags.mockResolvedValue([]);

      renderEditor();

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument();
      });
    });

    it('has no accessibility violations in loaded state', async () => {
      const { container } = renderEditor();
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ─── Preview mode ─────────────────────────────────────────────────────────

  describe('preview mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockResolvedValue(samplePage);
      mockListTags.mockResolvedValue([]);
    });

    it('toggles preview when Preview button is clicked', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      const previewBtn = screen.getByTitle('Preview');
      fireEvent.click(previewBtn);

      // In preview mode, the title input should be disabled
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeDisabled();
      });
    });

    it('hides formatting toolbar in preview mode', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      // Initially toolbar is visible — check the toolbar element
      await waitFor(() => {
        const toolbar = document.querySelector('.editor-toolbar');
        expect(toolbar).toBeTruthy();
      });

      // Toggle preview
      fireEvent.click(screen.getByTitle('Preview'));

      await waitFor(() => {
        expect(document.querySelector('.editor-toolbar')).toBeNull();
      });
    });
  });

  // ─── Tag management ───────────────────────────────────────────────────────

  describe('tag management', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockResolvedValue(samplePage);
      mockListTags.mockResolvedValue([
        { id: 't1', name: 'docs', value: 'docs' },
        { id: 't2', name: 'important', value: 'important' },
      ]);
    });

    it('shows existing tags', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByText('docs')).toBeInTheDocument();
        expect(screen.getByText('important')).toBeInTheDocument();
      });
    });

    it('shows tag input', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('+ tag')).toBeInTheDocument();
      });
    });

    it("shows 'Add tags...' placeholder when no tags", async () => {
      mockListTags.mockResolvedValue([]);
      renderEditor();

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument();
      });
    });
  });

  // ─── Color picker ─────────────────────────────────────────────────────────

  describe('color picker', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockResolvedValue(samplePage);
      mockListTags.mockResolvedValue([]);
    });

    it('shows color palette button', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      expect(screen.getByTitle('Page color accent')).toBeInTheDocument();
    });

    it('opens color picker on click', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByTitle('Page color accent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Page color accent'));

      // The "No color" button should be visible in the picker
      await waitFor(() => {
        expect(screen.getByTitle('No color')).toBeInTheDocument();
      });
    });

    it('sets a page color when a color is picked', async () => {
      mockSetColor.mockResolvedValue(undefined);
      renderEditor();

      await waitFor(() => {
        expect(screen.getByTitle('Page color accent')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Page color accent'));

      // Pick a color
      await waitFor(() => {
        // Find a color swatch button that's not "No color"
        const colorBtns = document.querySelectorAll("[style*='background-color']");
        let clicked = false;
        for (const btn of Array.from(colorBtns)) {
          const style = (btn as HTMLElement).style.backgroundColor;
          if (style && style !== 'transparent') {
            fireEvent.click(btn);
            clicked = true;
            break;
          }
        }
        expect(clicked).toBe(true);
      });

      await waitFor(() => {
        expect(mockSetColor).toHaveBeenCalledWith('p1', expect.any(String));
      });
    });
  });

  // ─── Full-width toggle ────────────────────────────────────────────────────

  describe('full-width toggle', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockResolvedValue(samplePage);
      mockListTags.mockResolvedValue([]);
      mockSetFullWidth.mockResolvedValue(undefined);
    });

    it('toggles full-width on click', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Full width'));

      await waitFor(() => {
        expect(mockSetFullWidth).toHaveBeenCalledWith('p1', true);
      });
    });
  });

  // ─── Text direction toggle ────────────────────────────────────────────────

  describe('direction toggle', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockResolvedValue(samplePage);
      mockListTags.mockResolvedValue([]);
      mockSetDirection.mockResolvedValue(undefined);
    });

    it('toggles text direction', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });

      const dirBtn = screen.getByTitle(/Switch to RTL/);
      fireEvent.click(dirBtn);

      await waitFor(() => {
        expect(mockSetDirection).toHaveBeenCalledWith('p1', 'rtl');
      });
    });
  });

  // ─── Keyboard shortcuts modal ─────────────────────────────────────────────

  describe('keyboard shortcuts modal', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockResolvedValue(samplePage);
      mockListTags.mockResolvedValue([]);
    });

    it('is not visible by default', async () => {
      renderEditor();
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
      });
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });

  // ─── Editor mode tabs ─────────────────────────────────────────────────────

  describe('editor mode tabs', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockResolvedValue(samplePage);
      mockListTags.mockResolvedValue([]);
    });

    it('shows WYSIWYG, Markdown, and Split tabs', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByText('WYSIWYG')).toBeInTheDocument();
        expect(screen.getByText('Markdown')).toBeInTheDocument();
        expect(screen.getByText('Split')).toBeInTheDocument();
      });
    });

    it('switches to Markdown mode', async () => {
      mockEditor.getJSON.mockReturnValue({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'test content' }] }],
      });
      renderEditor();

      await waitFor(() => {
        expect(screen.getByText('Markdown')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Markdown'));

      await waitFor(() => {
        // Markdown textarea should appear with converted content
        const textarea = document.querySelector('textarea');
        expect(textarea).toBeTruthy();
        expect(textarea?.textContent || textarea?.nodeValue || '').not.toBeNull();
      });
    });
  });

  // ─── Error state ──────────────────────────────────────────────────────────

  describe('error state', () => {
    it('displays error when page load fails', async () => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockRejectedValue(new Error('Page not found'));
      mockListTags.mockResolvedValue([]);
      renderEditor();

      await waitFor(() => {
        expect(screen.getByText(/Page not found/)).toBeInTheDocument();
      });
    });

    it('has no accessibility violations in error state', async () => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockRejectedValue(new Error('Page not found'));
      mockListTags.mockResolvedValue([]);
      const { container } = renderEditor();

      await waitFor(() => {
        expect(screen.getByText(/Page not found/)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ─── Back navigation ──────────────────────────────────────────────────────

  describe('back navigation', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'p1' });
      mockGetPage.mockResolvedValue(samplePage);
      mockListTags.mockResolvedValue([]);
    });

    it('navigates back when back button is clicked', async () => {
      renderEditor();

      await waitFor(() => {
        expect(screen.getByTitle('Back')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('Back'));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});
