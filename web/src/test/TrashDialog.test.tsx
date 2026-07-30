import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrashDialog } from '../components/TrashDialog';

const mockPages = [
  {
    id: 'p1',
    title: 'Old Page',
    slug: 'old',
    content: '',
    text_content: '',
    collection_id: 'c1',
    parent_page_id: '',
    status: 'deleted',
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
    published_at: 0,
    deleted_at: 1234567890,
    direction: '',
  },
  {
    id: 'p2',
    title: 'Draft Doc',
    slug: 'draft',
    content: '',
    text_content: '',
    collection_id: 'c1',
    parent_page_id: '',
    status: 'deleted',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 1,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: 2000,
    updated_at: 2000,
    published_at: 0,
    deleted_at: 1234567890,
    direction: '',
  },
];

describe('TrashDialog', () => {
  const baseProps = {
    trashPages: mockPages,
    trashLoading: false,
    onClose: vi.fn(),
    onRestore: vi.fn(),
    onPermanentDelete: vi.fn(),
    onEmptyTrash: vi.fn(),
  };

  it('renders the dialog with trash page list', () => {
    render(<TrashDialog {...baseProps} />);
    expect(screen.getByText('Trash')).toBeInTheDocument();
    expect(screen.getByText('Old Page')).toBeInTheDocument();
    expect(screen.getByText('Draft Doc')).toBeInTheDocument();
  });

  it('shows Restore and Delete buttons for each page', () => {
    render(<TrashDialog {...baseProps} />);
    const restoreButtons = screen.getAllByText('Restore');
    const deleteButtons = screen.getAllByText('Delete');
    expect(restoreButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });

  it('shows loading spinner when trashLoading is true', () => {
    render(<TrashDialog {...baseProps} trashLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Old Page')).not.toBeInTheDocument();
  });

  it('shows empty state when no trash pages', () => {
    render(<TrashDialog {...baseProps} trashPages={[]} />);
    expect(screen.getByText('Trash is empty')).toBeInTheDocument();
  });

  it('calls onRestore when Restore button is clicked', () => {
    const onRestore = vi.fn();
    render(<TrashDialog {...baseProps} onRestore={onRestore} />);
    fireEvent.click(screen.getAllByText('Restore')[0]);
    expect(onRestore).toHaveBeenCalledWith('p1');
  });

  it('calls onPermanentDelete when Delete button is clicked', () => {
    const onPermanentDelete = vi.fn();
    render(<TrashDialog {...baseProps} onPermanentDelete={onPermanentDelete} />);
    fireEvent.click(screen.getAllByText('Delete')[1]);
    expect(onPermanentDelete).toHaveBeenCalledWith('p2');
  });

  it('calls onEmptyTrash when Empty trash button is clicked', () => {
    const onEmptyTrash = vi.fn();
    render(<TrashDialog {...baseProps} onEmptyTrash={onEmptyTrash} />);
    fireEvent.click(screen.getByText('Empty trash'));
    expect(onEmptyTrash).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<TrashDialog {...baseProps} onClose={onClose} />);
    // Click the overlay backdrop, not the dialog container
    const overlay = container.querySelector('.dialog-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when dialog content is clicked', () => {
    const onClose = vi.fn();
    render(<TrashDialog {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Trash'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
