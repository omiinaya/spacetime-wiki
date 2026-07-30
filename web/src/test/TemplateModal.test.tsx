import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateModal } from '../components/TemplateModal';

const mockTemplates = [
  {
    id: 't1', title: 'Meeting Notes', slug: 'meeting-template', content: '<h1>Meeting</h1>',
    text_content: 'A template for meeting notes', collection_id: 'c1', parent_page_id: '',
    status: 'active', icon: '📝', color: '', full_width: false, is_pinned: false,
    is_template: true, template_id: '', sort_order: 0, created_by: 'u1', updated_by: 'u1',
    created_at: 1000, updated_at: 1000, published_at: 0, deleted_at: 0, direction: '',
  },
  {
    id: 't2', title: 'Sprint Plan', slug: 'sprint-template', content: '<h1>Sprint</h1>',
    text_content: 'Plan your sprint', collection_id: 'c1', parent_page_id: '',
    status: 'active', icon: '🚀', color: '', full_width: false, is_pinned: false,
    is_template: true, template_id: '', sort_order: 1, created_by: 'u1', updated_by: 'u1',
    created_at: 2000, updated_at: 2000, published_at: 0, deleted_at: 0, direction: '',
  },
];

describe('TemplateModal', () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    templates: mockTemplates,
    selectedTemplate: '',
    onSelectTemplate: vi.fn(),
    newPageTitle: '',
    onNewPageTitleChange: vi.fn(),
    onCreateFromTemplate: vi.fn(),
    createDisabled: false,
  };

  it('renders nothing when open is false', () => {
    const { container } = render(<TemplateModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders heading and close button', () => {
    render(<TemplateModal {...baseProps} />);
    expect(screen.getByText('New from template')).toBeInTheDocument();
  });

  it('renders template cards', () => {
    render(<TemplateModal {...baseProps} />);
    expect(screen.getByText(/📝 Meeting Notes/)).toBeInTheDocument();
    expect(screen.getByText(/🚀 Sprint Plan/)).toBeInTheDocument();
  });

  it('shows empty state when no templates', () => {
    render(<TemplateModal {...baseProps} templates={[]} />);
    expect(screen.getByText(/No templates yet/)).toBeInTheDocument();
  });

  it('calls onSelectTemplate when a template is clicked', () => {
    const onSelectTemplate = vi.fn();
    render(<TemplateModal {...baseProps} onSelectTemplate={onSelectTemplate} />);
    fireEvent.click(screen.getByText(/📝 Meeting Notes/));
    expect(onSelectTemplate).toHaveBeenCalledWith('t1', 'Meeting Notes');
  });

  it('shows title input and Create button when template is selected', () => {
    render(<TemplateModal {...baseProps} selectedTemplate="t1" />);
    expect(screen.getByPlaceholderText('New page title')).toBeInTheDocument();
    expect(screen.getByText('Create from template')).toBeInTheDocument();
  });

  it('calls onNewPageTitleChange when typing title', () => {
    const onNewPageTitleChange = vi.fn();
    render(
      <TemplateModal
        {...baseProps}
        selectedTemplate="t1"
        onNewPageTitleChange={onNewPageTitleChange}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('New page title'), {
      target: { value: 'My Meeting' },
    });
    expect(onNewPageTitleChange).toHaveBeenCalledWith('My Meeting');
  });

  it('calls onCreateFromTemplate when Create button is clicked', () => {
    const onCreateFromTemplate = vi.fn();
    render(
      <TemplateModal
        {...baseProps}
        selectedTemplate="t1"
        onCreateFromTemplate={onCreateFromTemplate}
      />,
    );
    fireEvent.click(screen.getByText('Create from template'));
    expect(onCreateFromTemplate).toHaveBeenCalled();
  });

  it('disables Create button when createDisabled is true', () => {
    render(<TemplateModal {...baseProps} selectedTemplate="t1" createDisabled={true} />);
    expect(screen.getByText('Create from template')).toBeDisabled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<TemplateModal {...baseProps} onClose={onClose} />);
    const overlay = container.querySelector('.dialog-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when dialog content is clicked', () => {
    const onClose = vi.fn();
    render(<TemplateModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('New from template'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
