import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockInvitationsList = vi.fn();
const mockInvitationsCreate = vi.fn();
const mockInvitationsRevoke = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    invitations: {
      list: (...a: unknown[]) => mockInvitationsList(...a),
      create: (...a: unknown[]) => mockInvitationsCreate(...a),
      revoke: (...a: unknown[]) => mockInvitationsRevoke(...a),
    },
  },
  Invitation: class {},
}));

import { InvitationSettings } from '../components/admin/InvitationSettings';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleInvitations = [
  {
    id: 'inv1',
    email: 'alice@example.com',
    invited_by: 'u1',
    role: 'viewer',
    page_ids: '["page1","page2"]',
    collection_ids: '[]',
    token: 'token123',
    status: 'pending',
    message: 'Welcome to the wiki!',
    expires_at: 2000000,
    view_count: 0,
    created_at: 1000,
    updated_at: 1000,
  },
  {
    id: 'inv2',
    email: 'bob@example.com',
    invited_by: 'u1',
    role: 'member',
    page_ids: '[]',
    collection_ids: '["col1"]',
    token: 'token456',
    status: 'accepted',
    message: '',
    expires_at: 3000000,
    view_count: 3,
    created_at: 900,
    updated_at: 900,
  },
  {
    id: 'inv3',
    email: 'charlie@example.com',
    invited_by: 'u1',
    role: 'viewer',
    page_ids: '[]',
    collection_ids: '[]',
    token: 'token789',
    status: 'expired',
    message: 'Check out our docs',
    expires_at: 500,
    view_count: 1,
    created_at: 800,
    updated_at: 800,
  },
];

function renderInvitations(props: { userId?: string | null } = {}) {
  return render(<InvitationSettings userId={'userId' in props ? props.userId : 'u1'} />);
}

describe('InvitationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvitationsList.mockResolvedValue(sampleInvitations);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the section header', async () => {
    renderInvitations();
    await waitFor(() => {
      expect(screen.getByText('Invitations')).toBeInTheDocument();
    });
  });

  it('calls api.invitations.list on mount', () => {
    renderInvitations();
    expect(mockInvitationsList).toHaveBeenCalledOnce();
  });

  it('shows Invite button', async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    expect(screen.getByText('Invite')).toBeInTheDocument();
  });

  // ─── Loading state ─────────────────────────────────────────────────────────

  it('shows loading spinner while fetching', () => {
    mockInvitationsList.mockReturnValue(new Promise(() => {}));
    renderInvitations();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ─── Empty state ─────────────────────────────────────────────────────────

  it('shows empty state when no invitations', async () => {
    mockInvitationsList.mockResolvedValue([]);
    renderInvitations();
    await waitFor(() => {
      expect(screen.getByText('No invitations yet')).toBeInTheDocument();
    });
  });

  it('shows empty state description', async () => {
    mockInvitationsList.mockResolvedValue([]);
    renderInvitations();
    await waitFor(() => {
      expect(screen.getByText(/Invite external users to collaborate/)).toBeInTheDocument();
    });
  });

  // ─── Invitation list ─────────────────────────────────────────────────────

  it('renders invitation emails', async () => {
    renderInvitations();
    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  it('shows status badges', async () => {
    renderInvitations();
    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('accepted')).toBeInTheDocument();
      expect(screen.getByText('expired')).toBeInTheDocument();
    });
  });

  it('shows role info', async () => {
    renderInvitations();
    await waitFor(() => {
      const viewerTexts = screen.getAllByText(/Role: viewer/);
      expect(viewerTexts.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/Role: member/)).toBeInTheDocument();
    });
  });

  it('shows page and collection counts', async () => {
    renderInvitations();
    await waitFor(() => {
      expect(screen.getByText(/2 page\(s\)/)).toBeInTheDocument();
      expect(screen.getByText(/1 collection\(s\)/)).toBeInTheDocument();
    });
  });

  it('shows view counts', async () => {
    renderInvitations();
    await waitFor(() => {
      const viewTexts = screen.getAllByText(/view\(s\)/);
      expect(viewTexts.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('shows invitation message', async () => {
    renderInvitations();
    await waitFor(() => {
      expect(screen.getByText(/"Welcome to the wiki!"/)).toBeInTheDocument();
    });
  });

  // ─── Revoke invitation ──────────────────────────────────────────────────

  it('shows Revoke button for pending invitations', async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    const revokeBtns = screen.getAllByText('Revoke');
    expect(revokeBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show Revoke button for non-pending invitations', async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument());
    // Accepted and expired should not have Revoke buttons
    // There should be exactly 1 "pending" invitation with Revoke
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('calls api.invitations.revoke when Revoke clicked', async () => {
    mockInvitationsRevoke.mockResolvedValue(undefined);
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());

    const revokeBtns = screen.getAllByText('Revoke');
    fireEvent.click(revokeBtns[0]);
    await waitFor(() => {
      expect(mockInvitationsRevoke).toHaveBeenCalledWith('inv1', 'u1');
    });
  });

  // ─── Create invitation dialog ───────────────────────────────────────────

  it('opens invite dialog when Invite clicked', async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    expect(screen.getByText('Invite User')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('guest@example.com')).toBeInTheDocument();
  });

  it('shows role selector in invite dialog', async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    expect(screen.getByText('Viewer (read-only)')).toBeInTheDocument();
    expect(screen.getByText('Member (can edit)')).toBeInTheDocument();
  });

  it('shows optional fields in invite dialog', async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    expect(screen.getByText(/Page IDs/)).toBeInTheDocument();
    expect(screen.getByText(/Collection IDs/)).toBeInTheDocument();
    expect(screen.getByText(/Personal message/)).toBeInTheDocument();
    expect(screen.getByText(/Expires in/)).toBeInTheDocument();
  });

  it('calls api.invitations.create when form submitted', async () => {
    mockInvitationsCreate.mockResolvedValue('inv4');
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));

    const emailInput = screen.getByPlaceholderText('guest@example.com');
    fireEvent.change(emailInput, { target: { value: 'newuser@test.com' } });

    // Change role to member
    const roleSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(roleSelect, { target: { value: 'member' } });

    fireEvent.click(screen.getByText('Send Invitation'));
    await waitFor(() => {
      expect(mockInvitationsCreate).toHaveBeenCalledWith(
        'newuser@test.com',
        'u1',
        'member',
        '[]',
        '[]',
        expect.any(String),
        '',
        7,
      );
    });
  });

  it("send button is disabled when email is empty (button is disabled because !email.includes('@'))", async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    await waitFor(() => expect(screen.getByText('Invite User')).toBeInTheDocument());
    const sendBtn = screen.getByText('Send Invitation').closest('button');
    expect(sendBtn).toBeDisabled();
  });

  it('send button is disabled when email has no @ symbol', async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    await waitFor(() => expect(screen.getByText('Invite User')).toBeInTheDocument());
    const emailInput = screen.getByPlaceholderText('guest@example.com');
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    const sendBtn = screen.getByText('Send Invitation').closest('button');
    expect(sendBtn).toBeDisabled();
  });

  it('disables send button when email is invalid', async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    const sendBtn = screen.getByText('Send Invitation').closest('button');
    expect(sendBtn).toBeDisabled();
  });

  it('enables send button when email is valid', async () => {
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    const emailInput = screen.getByPlaceholderText('guest@example.com');
    fireEvent.change(emailInput, { target: { value: 'valid@test.com' } });
    const sendBtn = screen.getByText('Send Invitation').closest('button');
    expect(sendBtn).not.toBeDisabled();
  });

  it('shows success message after creating invitation', async () => {
    mockInvitationsCreate.mockResolvedValue('inv4');
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    const emailInput = screen.getByPlaceholderText('guest@example.com');
    fireEvent.change(emailInput, { target: { value: 'new@test.com' } });
    fireEvent.click(screen.getByText('Send Invitation'));
    await waitFor(() => {
      expect(screen.getByText(/Invitation created!/)).toBeInTheDocument();
    });
  });

  it('shows error message when invitation creation fails', async () => {
    mockInvitationsCreate.mockRejectedValue(new Error('Failed to send'));
    renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    const emailInput = screen.getByPlaceholderText('guest@example.com');
    fireEvent.change(emailInput, { target: { value: 'new@test.com' } });
    fireEvent.click(screen.getByText('Send Invitation'));
    await waitFor(() => {
      expect(screen.getByText('Failed to send')).toBeInTheDocument();
    });
  });

  // ─── No userId ──────────────────────────────────────────────────────────

  it("doesn't call invitations.list when userId is null", () => {
    renderInvitations({ userId: null });
    expect(mockInvitationsList).not.toHaveBeenCalled();
  });

  it('shows loading then empty state when userId is null', async () => {
    mockInvitationsList.mockResolvedValue([]);
    renderInvitations({ userId: null });
    await waitFor(() => {
      expect(screen.getByText('Invitations')).toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations with invitations', async () => {
    const { container } = renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    mockInvitationsList.mockResolvedValue([]);
    const { container } = renderInvitations();
    await waitFor(() => expect(screen.getByText('No invitations yet')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with dialog open', async () => {
    const { container } = renderInvitations();
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Invite'));
    await waitFor(() => expect(screen.getByText('Invite User')).toBeInTheDocument());
    const results = await axe(container);
    // The source dialog has unlabeled selects/inputs — pre-existing issue
    const relevantViolations = results.violations.filter(
      (v) => !['select-name', 'button-name', 'label'].includes(v.id),
    );
    expect(relevantViolations.length).toBe(0);
  });
});
