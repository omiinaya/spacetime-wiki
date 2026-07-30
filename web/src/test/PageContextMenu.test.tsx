import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageContextMenu } from '../components/PageContextMenu';

// Mock Toast to avoid side effects in tests
vi.mock('../components/Toast', () => ({
  showToast: vi.fn(),
}));

const mockPages = [
  { id: 'p1', title: 'Welcome Page', slug: 'welcome', content: '', text_content: '',
    collection_id: 'c1', parent_page_id: '', status: 'active', icon: '', color: '',
    full_width: false, is_pinned: false, is_template: false, template_id: '',
    sort_order: 0, created_by: 'u1', updated_by: 'u1', created_at: 1000,
    updated_at: 1000, published_at: 0, deleted_at: 0, direction: '', status_color: '' },
];

const mockCollections = [
  { id: 'c1', name: 'Engineering', slug: 'eng', description: '', parent_id: '',
    icon: '', color: '#3b82f6', sort_order: 0, created_by: 'u1',
    created_at: 500, updated_at: 500 },
];

describe('PageContextMenu — page context', () => {
  const baseProps = {
    contextMenu: { x: 100, y: 200, pageId: 'p1' },
    onClose: vi.fn(),
    pages: mockPages,
    collections: mockCollections,
    navigate: vi.fn(),
    onDuplicate: vi.fn(),
    onExportMD: vi.fn(),
    onExportHTML: vi.fn(),
    onEditCol: vi.fn(),
    onDeleteCol: vi.fn(),
    onDeletePage: vi.fn(),
  };

  it('renders page context menu items', () => {
    render(<PageContextMenu {...baseProps} />);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Export Markdown')).toBeInTheDocument();
    expect(screen.getByText('Export HTML')).toBeInTheDocument();
    expect(screen.getByText('Copy link')).toBeInTheDocument();
    expect(screen.getByText('Copy as markdown link')).toBeInTheDocument();
    expect(screen.getByText('Move to trash')).toBeInTheDocument();
  });

  it('navigates to page on Open click', () => {
    const navigate = vi.fn();
    render(<PageContextMenu {...baseProps} navigate={navigate} />);
    fireEvent.click(screen.getByText('Open'));
    expect(navigate).toHaveBeenCalledWith('/page/p1');
  });

  it('navigates to edit page on Edit click', () => {
    const navigate = vi.fn();
    render(<PageContextMenu {...baseProps} navigate={navigate} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(navigate).toHaveBeenCalledWith('/page/p1/edit');
  });

  it('calls onDuplicate with page ID', () => {
    const onDuplicate = vi.fn();
    render(<PageContextMenu {...baseProps} onDuplicate={onDuplicate} />);
    fireEvent.click(screen.getByText('Duplicate'));
    expect(onDuplicate).toHaveBeenCalledWith('p1');
  });

  it('calls onExportMD with page ID', () => {
    const onExportMD = vi.fn();
    render(<PageContextMenu {...baseProps} onExportMD={onExportMD} />);
    fireEvent.click(screen.getByText('Export Markdown'));
    expect(onExportMD).toHaveBeenCalledWith('p1');
  });

  it('calls onExportHTML with page ID', () => {
    const onExportHTML = vi.fn();
    render(<PageContextMenu {...baseProps} onExportHTML={onExportHTML} />);
    fireEvent.click(screen.getByText('Export HTML'));
    expect(onExportHTML).toHaveBeenCalledWith('p1');
  });

  it('calls onDeletePage with page ID', () => {
    const onDeletePage = vi.fn();
    render(<PageContextMenu {...baseProps} onDeletePage={onDeletePage} />);
    fireEvent.click(screen.getByText('Move to trash'));
    expect(onDeletePage).toHaveBeenCalledWith('p1');
  });

  it('calls onClose after any action', () => {
    const onClose = vi.fn();
    render(<PageContextMenu {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Duplicate'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('PageContextMenu — collection context', () => {
  const baseProps = {
    contextMenu: { x: 100, y: 200, colId: 'c1' },
    onClose: vi.fn(),
    pages: mockPages,
    collections: mockCollections,
    navigate: vi.fn(),
    onDuplicate: vi.fn(),
    onExportMD: vi.fn(),
    onExportHTML: vi.fn(),
    onEditCol: vi.fn(),
    onDeleteCol: vi.fn(),
    onDeletePage: vi.fn(),
  };

  it('renders collection context menu items', () => {
    render(<PageContextMenu {...baseProps} />);
    expect(screen.getByText('Edit collection')).toBeInTheDocument();
    expect(screen.getByText('Delete collection')).toBeInTheDocument();
  });

  it('does not show page items in collection context', () => {
    render(<PageContextMenu {...baseProps} />);
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
    expect(screen.queryByText('Move to trash')).not.toBeInTheDocument();
  });

  it('calls onEditCol with collection', () => {
    const onEditCol = vi.fn();
    render(<PageContextMenu {...baseProps} onEditCol={onEditCol} />);
    fireEvent.click(screen.getByText('Edit collection'));
    expect(onEditCol).toHaveBeenCalledWith(mockCollections[0]);
  });

  it('calls onDeleteCol with collection ID', () => {
    const onDeleteCol = vi.fn();
    render(<PageContextMenu {...baseProps} onDeleteCol={onDeleteCol} />);
    fireEvent.click(screen.getByText('Delete collection'));
    expect(onDeleteCol).toHaveBeenCalledWith('c1');
  });
});
