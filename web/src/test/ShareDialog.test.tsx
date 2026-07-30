import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareDialog } from '../components/ShareDialog';

const mockShareLinks = [
  { id: 's1', token: 'abc123def456', expires_at: 2000000, visit_count: 5,
    password_hash: '', brand_title: null, brand_logo_url: null },
  { id: 's2', token: 'xyz789uvw012', expires_at: 3000000, visit_count: 0,
    password_hash: 'hash1', brand_title: 'My Brand', brand_logo_url: 'https://example.com/logo.png' },
];

describe('ShareDialog', () => {
  const baseProps = {
    pageTitle: 'Test Page',
    sharePassword: '',
    onPasswordChange: vi.fn(),
    shareDays: 7,
    onDaysChange: vi.fn(),
    shareUrl: '',
    shareLinks: mockShareLinks,
    onCreateShare: vi.fn(),
    onDeleteShare: vi.fn(),
    editBrandShareId: null,
    onEditBrandShareId: vi.fn(),
    editBrandTitle: '',
    onEditBrandTitle: vi.fn(),
    editBrandLogoUrl: '',
    onEditBrandLogoUrl: vi.fn(),
    onUpdateBranding: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders the dialog with page title', () => {
    render(<ShareDialog {...baseProps} />);
    expect(screen.getByText(/Share/)).toBeInTheDocument();
    expect(screen.getByText(/"Test Page"/)).toBeInTheDocument();
  });

  it('renders password and expiration inputs', () => {
    render(<ShareDialog {...baseProps} />);
    expect(screen.getByPlaceholderText('Leave empty for public link')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();
  });

  it('renders "Create share link" button', () => {
    render(<ShareDialog {...baseProps} />);
    expect(screen.getByText('Create share link')).toBeInTheDocument();
  });

  it('shows share URL when provided', () => {
    render(<ShareDialog {...baseProps} shareUrl="https://example.com/s/abc123" />);
    expect(screen.getByDisplayValue('https://example.com/s/abc123')).toBeInTheDocument();
  });

  it('lists active share links with token previews', () => {
    render(<ShareDialog {...baseProps} />);
    expect(screen.getByText('Active shares')).toBeInTheDocument();
    expect(screen.getByText('abc123def456...')).toBeInTheDocument();
    expect(screen.getByText('xyz789uvw012...')).toBeInTheDocument();
  });

  it('shows visit counts for share links', () => {
    render(<ShareDialog {...baseProps} />);
    expect(screen.getByText('5 views')).toBeInTheDocument();
    expect(screen.getByText('0 views')).toBeInTheDocument();
  });

  it('shows lock icon for password-protected shares', () => {
    render(<ShareDialog {...baseProps} />);
    // The first share has no password, the second has one
    const lockElements = screen.getAllByText('🔒');
    expect(lockElements).toHaveLength(1);
  });

  it('calls onCreateShare when Create button is clicked', () => {
    const onCreateShare = vi.fn();
    render(<ShareDialog {...baseProps} onCreateShare={onCreateShare} />);
    fireEvent.click(screen.getByText('Create share link'));
    expect(onCreateShare).toHaveBeenCalled();
  });

  it('calls onDeleteShare when × button is clicked', () => {
    const onDeleteShare = vi.fn();
    render(<ShareDialog {...baseProps} onDeleteShare={onDeleteShare} />);
    const deleteButtons = screen.getAllByText('×');
    fireEvent.click(deleteButtons[0]);
    expect(onDeleteShare).toHaveBeenCalledWith('s1');
  });

  it('calls onEditBrandShareId when branding button is clicked', () => {
    const onEditBrandShareId = vi.fn();
    render(<ShareDialog {...baseProps} onEditBrandShareId={onEditBrandShareId} />);
    const brandButtons = screen.getAllByTitle('Customize branding');
    fireEvent.click(brandButtons[0]);
    expect(onEditBrandShareId).toHaveBeenCalledWith('s1');
  });

  it('shows branding inputs when editing a share brand', () => {
    render(<ShareDialog {...baseProps} editBrandShareId="s1" />);
    expect(screen.getByPlaceholderText('Custom page title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Logo URL')).toBeInTheDocument();
    expect(screen.getByText('Save branding')).toBeInTheDocument();
  });

  it('calls onUpdateBranding when Save branding is clicked', () => {
    const onUpdateBranding = vi.fn();
    render(<ShareDialog {...baseProps} editBrandShareId="s1" onUpdateBranding={onUpdateBranding} />);
    fireEvent.click(screen.getByText('Save branding'));
    expect(onUpdateBranding).toHaveBeenCalledWith('s1');
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<ShareDialog {...baseProps} onClose={onClose} />);
    const overlay = container.querySelector('.dialog-overlay')!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onPasswordChange when typing password', () => {
    const onPasswordChange = vi.fn();
    render(<ShareDialog {...baseProps} onPasswordChange={onPasswordChange} />);
    fireEvent.change(screen.getByPlaceholderText('Leave empty for public link'), {
      target: { value: 'secret' },
    });
    expect(onPasswordChange).toHaveBeenCalledWith('secret');
  });

  it('calls onDaysChange when changing days', () => {
    const onDaysChange = vi.fn();
    render(<ShareDialog {...baseProps} onDaysChange={onDaysChange} />);
    fireEvent.change(screen.getByDisplayValue('7'), { target: { value: '30' } });
    expect(onDaysChange).toHaveBeenCalledWith(30);
  });
});
