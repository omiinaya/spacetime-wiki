import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../components/CommandPalette';
import { FileText, BookOpen } from 'lucide-react';

const sampleItems = [
  {
    type: 'page' as const,
    id: 'p1',
    label: 'Welcome Page',
    subtitle: 'Getting started guide',
    icon: <FileText className="h-4 w-4" />,
    action: vi.fn(),
    shortcut: '⌘P',
  },
  {
    type: 'collection' as const,
    id: 'c1',
    label: 'Engineering Wiki',
    subtitle: 'Engineering collection',
    icon: <BookOpen className="h-4 w-4" />,
    action: vi.fn(),
  },
  {
    type: 'action' as const,
    label: 'New page',
    subtitle: 'Create a blank page',
    icon: <FileText className="h-4 w-4" />,
    action: vi.fn(),
  },
];

describe('CommandPalette', () => {
  const baseProps = {
    open: true,
    query: '',
    onQueryChange: vi.fn(),
    index: 0,
    items: sampleItems,
    onExecute: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders nothing when open is false', () => {
    const { container } = render(<CommandPalette {...baseProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders search input with placeholder', () => {
    render(<CommandPalette {...baseProps} />);
    expect(screen.getByPlaceholderText('Search pages, collections, or actions...')).toBeInTheDocument();
  });

  it('renders all items', () => {
    render(<CommandPalette {...baseProps} />);
    expect(screen.getByText('Welcome Page')).toBeInTheDocument();
    expect(screen.getByText('Engineering Wiki')).toBeInTheDocument();
    expect(screen.getByText('New page')).toBeInTheDocument();
  });

  it('shows type badges (Page, Collection)', () => {
    render(<CommandPalette {...baseProps} />);
    expect(screen.getByText('Page')).toBeInTheDocument();
    expect(screen.getByText('Collection')).toBeInTheDocument();
  });

  it('shows keyboard shortcut when provided', () => {
    render(<CommandPalette {...baseProps} />);
    expect(screen.getByText('⌘P')).toBeInTheDocument();
  });

  it('highlights the selected index', () => {
    const { container } = render(<CommandPalette {...baseProps} index={1} />);
    const buttons = container.querySelectorAll('button');
    // The highlighted item (index 1 = second button) should have bg-primary/10 class
    expect(buttons[1].className).toContain('bg-primary/10');
    expect(buttons[0].className).not.toContain('bg-primary/10');
  });

  it('shows "No results" when items is empty', () => {
    render(<CommandPalette {...baseProps} items={[]} query="xyz" />);
    expect(screen.getByText(/No results/)).toBeInTheDocument();
    expect(screen.getByText(/xyz/)).toBeInTheDocument();
  });

  it('calls onQueryChange when typing', () => {
    const onQueryChange = vi.fn();
    render(<CommandPalette {...baseProps} onQueryChange={onQueryChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search pages, collections, or actions...'), {
      target: { value: 'test' },
    });
    expect(onQueryChange).toHaveBeenCalledWith('test');
  });

  it('calls onExecute with index when item is clicked', () => {
    const onExecute = vi.fn();
    render(<CommandPalette {...baseProps} onExecute={onExecute} />);
    fireEvent.click(screen.getByText('Engineering Wiki'));
    expect(onExecute).toHaveBeenCalledWith(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<CommandPalette {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText(/↑↓ navigate/));
  });

  it('renders footer with navigation hints', () => {
    render(<CommandPalette {...baseProps} />);
    expect(screen.getByText('↑↓ navigate')).toBeInTheDocument();
    expect(screen.getByText('↵ open')).toBeInTheDocument();
    expect(screen.getByText('esc close')).toBeInTheDocument();
  });
});
