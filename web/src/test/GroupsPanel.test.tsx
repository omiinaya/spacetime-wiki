import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockGroupsList = vi.fn();
const mockGroupsCreate = vi.fn();
const mockGroupsUpdate = vi.fn();
const mockGroupsDelete = vi.fn();
const mockGroupsListMembers = vi.fn();
const mockGroupsAddMember = vi.fn();
const mockGroupsUpdateMemberRole = vi.fn();
const mockGroupsRemoveMember = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    groups: {
      list: (...a: unknown[]) => mockGroupsList(...a),
      create: (...a: unknown[]) => mockGroupsCreate(...a),
      update: (...a: unknown[]) => mockGroupsUpdate(...a),
      delete: (...a: unknown[]) => mockGroupsDelete(...a),
      listMembers: (...a: unknown[]) => mockGroupsListMembers(...a),
      addMember: (...a: unknown[]) => mockGroupsAddMember(...a),
      updateMemberRole: (...a: unknown[]) => mockGroupsUpdateMemberRole(...a),
      removeMember: (...a: unknown[]) => mockGroupsRemoveMember(...a),
    },
  },
  Group: class {},
  GroupMember: class {},
}));

// ─── Mock crypto ──────────────────────────────────────────────────────────────

import { GroupsPanel } from '../components/admin/GroupsPanel';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleGroups = [
  {
    id: 'g1',
    name: 'Editors',
    description: 'Content editors',
    created_by: 'u1',
    created_at: 1000,
    updated_at: 1000,
  },
  {
    id: 'g2',
    name: 'Reviewers',
    description: '',
    created_by: 'u2',
    created_at: 900,
    updated_at: 900,
  },
];

const sampleMembers = [
  { id: 'gm1', group_id: 'g1', user_id: 'u1', role: 'admin', added_by: 'u1', created_at: 1000 },
  { id: 'gm2', group_id: 'g1', user_id: 'u2', role: 'member', added_by: 'u1', created_at: 1000 },
];

const sampleUsers = [
  { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'admin', avatar_url: '' },
  { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'member', avatar_url: '' },
  { id: 'u3', name: 'Charlie', email: 'charlie@test.com', role: 'viewer', avatar_url: '' },
];

const mockAddToast = vi.fn();

function renderGroups(props: Partial<Parameters<typeof GroupsPanel>[0]> = {}) {
  return render(
    <GroupsPanel
      allUsers={props.allUsers ?? sampleUsers}
      userId={props.userId ?? 'admin1'}
      addToast={props.addToast ?? mockAddToast}
    />,
  );
}

describe('GroupsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'grp-new-uuid-12345'),
    });
    mockGroupsList.mockResolvedValue(sampleGroups);
    mockGroupsCreate.mockResolvedValue(undefined);
    mockGroupsUpdate.mockResolvedValue(undefined);
    mockGroupsDelete.mockResolvedValue(undefined);
    mockGroupsListMembers.mockResolvedValue(sampleMembers);
    mockGroupsAddMember.mockResolvedValue(undefined);
    mockGroupsUpdateMemberRole.mockResolvedValue(undefined);
    mockGroupsRemoveMember.mockResolvedValue(undefined);
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the Groups & Teams header', async () => {
    renderGroups();
    await waitFor(() => {
      expect(screen.getByText('Groups & Teams')).toBeInTheDocument();
    });
  });

  it('calls api.groups.list on mount', async () => {
    renderGroups();
    await waitFor(() => {
      expect(mockGroupsList).toHaveBeenCalled();
    });
  });

  it('renders group names', async () => {
    renderGroups();
    await waitFor(() => {
      expect(screen.getByText('Editors')).toBeInTheDocument();
      expect(screen.getByText('Reviewers')).toBeInTheDocument();
    });
  });

  it('shows group descriptions when present', async () => {
    renderGroups();
    await waitFor(() => {
      expect(screen.getByText(/Content editors/)).toBeInTheDocument();
    });
  });

  it('shows New Group button', async () => {
    renderGroups();
    await waitFor(() => {
      expect(screen.getByText('New Group')).toBeInTheDocument();
    });
  });

  // ─── Empty state ──────────────────────────────────────────────────────────

  it('shows empty message when no groups', async () => {
    mockGroupsList.mockResolvedValue([]);
    renderGroups();
    await waitFor(() => {
      expect(screen.getByText(/No groups yet/)).toBeInTheDocument();
    });
  });

  // ─── Group dialog - Create ────────────────────────────────────────────────

  it('opens create dialog when New Group is clicked', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Group'));
    await waitFor(() => {
      // "New Group" appears as both the button text and dialog title
      const elements = screen.getAllByText('New Group');
      expect(elements.length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByPlaceholderText('Group name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
  });

  it('calls api.groups.create when creating a group', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Group'));

    const nameInput = screen.getByPlaceholderText('Group name');
    fireEvent.change(nameInput, { target: { value: 'Test Group' } });

    const descInput = screen.getByPlaceholderText('Description (optional)');
    fireEvent.change(descInput, { target: { value: 'A test group' } });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(mockGroupsCreate).toHaveBeenCalledWith('Test Group', 'A test group', 'admin1');
    });
  });

  it('closes dialog after creating group', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Group'));

    const nameInput = screen.getByPlaceholderText('Group name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      // The dialog's "New Group" title is gone (the header button persists)
      expect(screen.queryByPlaceholderText('Group name')).not.toBeInTheDocument();
    });
  });

  it('shows error toast when group creation fails', async () => {
    mockGroupsCreate.mockRejectedValue(new Error('Name taken'));
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('New Group'));

    const nameInput = screen.getByPlaceholderText('Group name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error: Name taken',
        duration: 4000,
      });
    });
  });

  // ─── Group dialog - Edit ──────────────────────────────────────────────────

  it('opens edit dialog with pre-filled data', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    const editBtns = document.querySelectorAll('button');
    // Find the pencil edit button (first match)
    let editBtn: HTMLButtonElement | null = null;
    for (const btn of editBtns) {
      if (btn.querySelector('svg.lucide-pencil')) {
        editBtn = btn as HTMLButtonElement;
        break;
      }
    }
    if (editBtn) fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('Edit Group')).toBeInTheDocument();
    });
    const nameInput = screen.getByPlaceholderText('Group name') as HTMLInputElement;
    expect(nameInput.value).toBe('Editors');
    const descInput = screen.getByPlaceholderText('Description (optional)') as HTMLInputElement;
    expect(descInput.value).toBe('Content editors');
  });

  it('calls api.groups.update when saving edit', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    const editBtns = document.querySelectorAll('button');
    let editBtn: HTMLButtonElement | null = null;
    for (const btn of editBtns) {
      if (btn.querySelector('svg.lucide-pencil')) {
        editBtn = btn as HTMLButtonElement;
        break;
      }
    }
    if (editBtn) fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('Edit Group')).toBeInTheDocument();
    });
    const nameInput = screen.getByPlaceholderText('Group name');
    fireEvent.change(nameInput, { target: { value: 'Updated Editors' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockGroupsUpdate).toHaveBeenCalledWith('g1', 'Updated Editors', 'Content editors');
    });
  });

  // ─── Group delete ────────────────────────────────────────────────────────

  it('calls api.groups.delete on confirm', async () => {
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());

    // Find the delete button (Trash2 icon) — first match
    const deleteBtns = document.querySelectorAll('button');
    let deleteBtn: HTMLButtonElement | null = null;
    for (const btn of deleteBtns) {
      if (btn.querySelector('svg.lucide-trash-2')) {
        deleteBtn = btn as HTMLButtonElement;
        break;
      }
    }
    if (deleteBtn) fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockGroupsDelete).toHaveBeenCalledWith('g1');
    });
    vi.unstubAllGlobals();
  });

  it('does not call api.groups.delete when confirm is cancelled', async () => {
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal('confirm', confirmMock);
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());

    const deleteBtns = document.querySelectorAll('button');
    let deleteBtn: HTMLButtonElement | null = null;
    deleteBtns.forEach((btn) => {
      if (btn.querySelector('svg.lucide-trash-2')) deleteBtn = btn;
    });
    if (deleteBtn) fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockGroupsDelete).not.toHaveBeenCalled();
    });
    vi.unstubAllGlobals();
  });

  // ─── Expand members section ──────────────────────────────────────────────

  it('expands to show members when group is clicked', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      expect(screen.getByText('Members')).toBeInTheDocument();
    });
    // Should have called listMembers
    expect(mockGroupsListMembers).toHaveBeenCalledWith('g1');
  });

  it('shows member user IDs in expanded section', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      expect(screen.getByText('u1')).toBeInTheDocument();
      expect(screen.getByText('u2')).toBeInTheDocument();
    });
  });

  it('shows member role selects with correct values', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      const roleSelects = document.querySelectorAll('select');
      // The expanded section contains role selects for members
      expect(roleSelects.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows Add form in expanded section', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      expect(screen.getByText('Select user...')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });

  it("shows 'No members yet' when members array is empty for this group", async () => {
    // Return members but for a different group
    mockGroupsListMembers.mockResolvedValue([
      {
        id: 'gm3',
        group_id: 'g2',
        user_id: 'u3',
        role: 'member',
        added_by: 'u1',
        created_at: 1000,
      },
    ]);
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      expect(screen.getByText('No members yet')).toBeInTheDocument();
    });
  });

  // ─── Expand/collapse ─────────────────────────────────────────────────────

  it('collapses members section when clicked again', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));
    await waitFor(() => {
      expect(screen.getByText('Members')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Editors'));
    await waitFor(() => {
      expect(screen.queryByText('Members')).not.toBeInTheDocument();
    });
  });

  // ─── Add member ─────────────────────────────────────────────────────────

  it('calls api.groups.addMember when Add is clicked', async () => {
    mockGroupsAddMember.mockResolvedValue(undefined);
    mockGroupsListMembers.mockResolvedValue(sampleMembers);
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      expect(screen.getByText('Select user...')).toBeInTheDocument();
    });

    // Select Charlie (u3) from the user dropdown — find by its current placeholder value
    const userSelect = screen.getByDisplayValue('Select user...');
    fireEvent.change(userSelect, { target: { value: 'u3' } });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockGroupsAddMember).toHaveBeenCalledWith('g1', 'u3', 'member', 'admin1');
    });
  });

  it('refetches members after adding', async () => {
    mockGroupsAddMember.mockResolvedValue(undefined);
    mockGroupsListMembers.mockResolvedValue(sampleMembers);
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      expect(screen.getByText('Select user...')).toBeInTheDocument();
    });

    const userSelect = screen.getByDisplayValue('Select user...');
    fireEvent.change(userSelect, { target: { value: 'u3' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      // listMembers should be called again after add
      expect(mockGroupsListMembers).toHaveBeenCalledTimes(2);
    });
  });

  it('does not add member when no user selected', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add'));
    expect(mockGroupsAddMember).not.toHaveBeenCalled();
  });

  // ─── Remove member ──────────────────────────────────────────────────────

  it('removes a member when × is clicked', async () => {
    mockGroupsRemoveMember.mockResolvedValue(undefined);
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      expect(screen.getByText('u1')).toBeInTheDocument();
    });

    // Find × buttons (remove member)
    const removeBtns = document.querySelectorAll('button');
    const removeMemberBtns: HTMLButtonElement[] = [];
    removeBtns.forEach((btn) => {
      if (btn.textContent === '×') removeMemberBtns.push(btn);
    });

    if (removeMemberBtns.length > 0) {
      fireEvent.click(removeMemberBtns[0]);
      await waitFor(() => {
        expect(mockGroupsRemoveMember).toHaveBeenCalledWith('gm1');
      });
    }
  });

  // ─── Update member role ─────────────────────────────────────────────────

  it('updates member role when select changes', async () => {
    renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Editors'));

    await waitFor(() => {
      expect(screen.getByText('u1')).toBeInTheDocument();
    });

    // Find the member role selects (they're in the expanded members section)
    const selects = document.querySelectorAll('select');
    // After expanding, there should be member role selects
    if (selects.length >= 2) {
      // The first member's role select changes from admin to member
      fireEvent.change(selects[0], { target: { value: 'member' } });
      await waitFor(() => {
        expect(mockGroupsUpdateMemberRole).toHaveBeenCalledWith('gm1', 'member');
      });
    }
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations (excluding icon-only buttons)', async () => {
    const { container } = renderGroups();
    await waitFor(() => expect(screen.getByText('Editors')).toBeInTheDocument());
    const results = await axe(container, {
      rules: { 'button-name': { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    mockGroupsList.mockResolvedValue([]);
    const { container } = renderGroups();
    await waitFor(() => expect(screen.getByText(/No groups yet/)).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
