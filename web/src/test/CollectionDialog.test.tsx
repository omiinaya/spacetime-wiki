import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollectionDialog } from '../components/CollectionDialog';

describe('CollectionDialog', () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    editingCol: null,
    colName: '',
    onColNameChange: vi.fn(),
    colDesc: '',
    onColDescChange: vi.fn(),
    colIcon: '',
    onColIconChange: vi.fn(),
    colColor: '',
    onColColorChange: vi.fn(),
    colSortMode: 'manual',
    onColSortModeChange: vi.fn(),
    colAutoApply: false,
    onColAutoApplyChange: vi.fn(),
    onSave: vi.fn(),
    saveDisabled: false,
  };

  it('renders nothing when open is false', () => {
    const { container } = render(<CollectionDialog {...baseProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "New collection" heading when creating', () => {
    render(<CollectionDialog {...baseProps} />);
    expect(screen.getByText('New collection')).toBeInTheDocument();
  });

  it('shows "Edit collection" heading when editing', () => {
    render(
      <CollectionDialog
        {...baseProps}
        editingCol={{ id: 'c1', name: 'Test', description: '', icon: '', color: '' }}
      />,
    );
    expect(screen.getByText('Edit collection')).toBeInTheDocument();
  });

  it('renders form inputs', () => {
    render(<CollectionDialog {...baseProps} />);
    expect(screen.getByPlaceholderText('📁')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Collection name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Color (hex, optional)')).toBeInTheDocument();
  });

  it('shows sort mode options when editing', () => {
    render(
      <CollectionDialog
        {...baseProps}
        editingCol={{ id: 'c1', name: 'Test', description: '', icon: '', color: '' }}
      />,
    );
    expect(screen.getByText('Page sort order')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Manual (drag to reorder)')).toBeInTheDocument();
  });

  it('shows auto-apply checkbox when sort mode is not manual', () => {
    render(
      <CollectionDialog
        {...baseProps}
        editingCol={{ id: 'c1', name: 'Test', description: '', icon: '', color: '' }}
        colSortMode="title-asc"
      />,
    );
    expect(screen.getByText('Auto-apply sort on page create/update')).toBeInTheDocument();
  });

  it('hides sort options when creating a new collection', () => {
    render(<CollectionDialog {...baseProps} />);
    expect(screen.queryByText('Page sort order')).not.toBeInTheDocument();
  });

  it('calls onColNameChange when typing name', () => {
    const onColNameChange = vi.fn();
    render(<CollectionDialog {...baseProps} onColNameChange={onColNameChange} />);
    fireEvent.change(screen.getByPlaceholderText('Collection name'), { target: { value: 'Docs' } });
    expect(onColNameChange).toHaveBeenCalledWith('Docs');
  });

  it('calls onColIconChange when typing icon', () => {
    const onColIconChange = vi.fn();
    render(<CollectionDialog {...baseProps} onColIconChange={onColIconChange} />);
    fireEvent.change(screen.getByPlaceholderText('📁'), { target: { value: '📚' } });
    expect(onColIconChange).toHaveBeenCalledWith('📚');
  });

  it('calls onSave when Create button is clicked', () => {
    const onSave = vi.fn();
    render(<CollectionDialog {...baseProps} onSave={onSave} />);
    fireEvent.click(screen.getByText('Create'));
    expect(onSave).toHaveBeenCalled();
  });

  it('shows "Save" button text when editing', () => {
    render(
      <CollectionDialog
        {...baseProps}
        editingCol={{ id: 'c1', name: 'Test', description: '', icon: '', color: '' }}
      />,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('disables Save button when saveDisabled is true', () => {
    render(<CollectionDialog {...baseProps} saveDisabled={true} />);
    expect(screen.getByText('Create')).toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<CollectionDialog {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onColAutoApplyChange when checkbox is toggled', () => {
    const onColAutoApplyChange = vi.fn();
    render(
      <CollectionDialog
        {...baseProps}
        editingCol={{ id: 'c1', name: 'Test', description: '', icon: '', color: '' }}
        colSortMode="title-asc"
        onColAutoApplyChange={onColAutoApplyChange}
      />,
    );
    fireEvent.click(screen.getByText('Auto-apply sort on page create/update'));
    expect(onColAutoApplyChange).toHaveBeenCalledWith(true);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<CollectionDialog {...baseProps} onClose={onClose} />);
    const overlay = container.querySelector('.dialog-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });
});
