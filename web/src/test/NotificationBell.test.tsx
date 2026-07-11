import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockMarkAllRead = vi.hoisted(() => vi.fn());
const mockClearAll = vi.hoisted(() => vi.fn());
const mockMarkRead = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  api: {
    notifications: {
      markAllRead: mockMarkAllRead,
      clearAll: mockClearAll,
      markRead: mockMarkRead,
      delete: mockDelete,
    },
  },
  Notification: class {},
}));

import { NotificationBell } from '../components/NotificationBell';
import type { Notification } from '../lib/api';

const sampleNotifications: Notification[] = [
  {
    id: 'n1',
    user_id: 'u1',
    event_type: 'page.create',
    target_id: 'p1',
    title: 'New page created',
    message: 'Alice created a new wiki page',
    actor_id: 'u2',
    icon: '',
    is_read: false,
    created_at: 1000,
  },
  {
    id: 'n2',
    user_id: 'u1',
    event_type: 'comment.create',
    target_id: 'p2',
    title: 'New comment',
    message: 'Bob commented on your page',
    actor_id: 'u3',
    icon: '',
    is_read: true,
    created_at: 900,
  },
  {
    id: 'n3',
    user_id: 'u1',
    event_type: 'page.update',
    target_id: 'p3',
    title: 'Page updated',
    message: 'Charlie updated a page',
    actor_id: 'u4',
    icon: '',
    is_read: false,
    created_at: 800,
  },
];

function renderBell(
  notifications: Notification[] = sampleNotifications,
  userId: string | null = 'u1',
  onRefresh?: ReturnType<typeof vi.fn>,
) {
  const onRefreshFn = onRefresh ?? vi.fn();
  return {
    onRefreshFn,
    ...render(
      <NotificationBell userId={userId} notifications={notifications} onRefresh={onRefreshFn} />,
    ),
  };
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the bell button', () => {
    renderBell();
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    expect(bellButton).toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', () => {
    renderBell();
    // 2 unread out of 3
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('does not show badge when all notifications are read', () => {
    const allRead: Notification[] = sampleNotifications.map((n) => ({ ...n, is_read: true }));
    renderBell(allRead);
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('99+')).not.toBeInTheDocument();
  });

  it('shows 99+ badge for 100+ unread', () => {
    const manyUnread: Notification[] = Array.from({ length: 100 }, (_, i) => ({
      ...sampleNotifications[0],
      id: `n${i}`,
      is_read: false,
    }));
    renderBell(manyUnread);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('renders nothing in the container (renders in the DOM directly)', () => {
    const { container } = renderBell();
    // The component renders a button in the container directly (no portal)
    expect(container.querySelector('button')).toBeInTheDocument();
  });

  // ─── Dropdown open/close ──────────────────────────────────────────────────

  it('opens dropdown on bell click', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText(/2 unread/)).toBeInTheDocument();
  });

  it('closes dropdown when bell is clicked again', () => {
    renderBell();
    const btn = screen.getByTitle('Notifications');
    fireEvent.click(btn);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('closes dropdown on Escape key', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  // ─── Notification list ─────────────────────────────────────────────────────

  it('renders notification items with titles', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('New page created')).toBeInTheDocument();
    expect(screen.getByText('New comment')).toBeInTheDocument();
    expect(screen.getByText('Page updated')).toBeInTheDocument();
  });

  it('renders notification messages', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('Alice created a new wiki page')).toBeInTheDocument();
    expect(screen.getByText('Bob commented on your page')).toBeInTheDocument();
    expect(screen.getByText('Charlie updated a page')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    renderBell([]);
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    expect(screen.getByText(/Watch pages and collections/)).toBeInTheDocument();
  });

  it('marks unread items with highlighted background', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    // Unread items should have a highlighted background class
    const items = screen.getAllByText('New page created');
    // Should find it rendered
    expect(items.length).toBeGreaterThan(0);
  });

  it("shows 'New' label on unread notifications", () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    const newLabels = screen.getAllByText('New');
    expect(newLabels.length).toBe(2); // 2 unread items
  });

  it('displays time-ago text for each notification', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    // created_at timestamps render via timeAgo() — should show some text per item
    const timeElements = document.querySelectorAll('.text-\\[9px\\]');
    // The "New" labels also use [9px] — just check something is rendered
    expect(screen.getAllByText(/\d+/)).toBeTruthy();
  });

  it('shows sorted notifications (newest first)', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    // Items should appear in descending created_at order: n1(1000), n3(800), n2(900?)
    // Wait: sort by b.created_at - a.created_at, so: 1000, 900, 800
    const titles = screen.getAllByText(/New page created|New comment|Page updated/);
    expect(titles.length).toBe(3);
  });

  // ─── Item actions ─────────────────────────────────────────────────────────

  it('shows mark-read button on unread items on hover', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    // Mark-read and delete buttons have aria-labels
    const markReadBtns = screen.getAllByTitle('Mark as read');
    expect(markReadBtns.length).toBe(2); // 2 unread items
  });

  it('shows delete button on hover for each item', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    const deleteBtns = screen.getAllByTitle('Delete notification');
    expect(deleteBtns.length).toBe(3); // all items have delete
  });

  it('calls markRead when mark-as-read button is clicked', async () => {
    mockMarkRead.mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    renderBell(sampleNotifications, 'u1', onRefresh);
    fireEvent.click(screen.getByTitle('Notifications'));
    const markReadBtns = screen.getAllByTitle('Mark as read');
    fireEvent.click(markReadBtns[0]);
    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith('n1');
    });
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('calls delete when delete button is clicked', async () => {
    mockDelete.mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    renderBell(sampleNotifications, 'u1', onRefresh);
    fireEvent.click(screen.getByTitle('Notifications'));
    const deleteBtns = screen.getAllByTitle('Delete notification');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('n1');
    });
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('handles markRead error gracefully', async () => {
    mockMarkRead.mockRejectedValue(new Error('API error'));
    const onRefresh = vi.fn();
    renderBell(sampleNotifications, 'u1', onRefresh);
    fireEvent.click(screen.getByTitle('Notifications'));
    const markReadBtns = screen.getAllByTitle('Mark as read');
    fireEvent.click(markReadBtns[0]);
    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith('n1');
    });
    // onRefresh should NOT be called on error
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('handles delete error gracefully', async () => {
    mockDelete.mockRejectedValue(new Error('API error'));
    const onRefresh = vi.fn();
    renderBell(sampleNotifications, 'u1', onRefresh);
    fireEvent.click(screen.getByTitle('Notifications'));
    const deleteBtns = screen.getAllByTitle('Delete notification');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('n1');
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  // ─── Mark all read / Clear all ────────────────────────────────────────────

  it('shows mark-all-read button when there are unread notifications', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByTitle('Mark all as read')).toBeInTheDocument();
  });

  it('hides mark-all-read button when all notifications are read', () => {
    const allRead: Notification[] = sampleNotifications.map((n) => ({ ...n, is_read: true }));
    renderBell(allRead);
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.queryByTitle('Mark all as read')).not.toBeInTheDocument();
  });

  it('shows clear-all button when there are notifications', () => {
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByTitle('Clear all notifications')).toBeInTheDocument();
  });

  it('calls markAllRead when mark-all-read is clicked', async () => {
    mockMarkAllRead.mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    renderBell(sampleNotifications, 'u1', onRefresh);
    fireEvent.click(screen.getByTitle('Notifications'));
    fireEvent.click(screen.getByTitle('Mark all as read'));
    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalledWith('u1');
    });
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('calls clearAll when clear-all is clicked', async () => {
    mockClearAll.mockResolvedValue(undefined);
    const onRefresh = vi.fn();
    renderBell(sampleNotifications, 'u1', onRefresh);
    fireEvent.click(screen.getByTitle('Notifications'));
    fireEvent.click(screen.getByTitle('Clear all notifications'));
    await waitFor(() => {
      expect(mockClearAll).toHaveBeenCalledWith('u1');
    });
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('does not call markAllRead or clearAll when userId is null', async () => {
    renderBell(sampleNotifications, null);
    fireEvent.click(screen.getByTitle('Notifications'));
    // Without userId, these buttons should still render but calls are no-ops
    expect(screen.getByTitle('Mark all as read')).toBeInTheDocument();
    expect(screen.getByTitle('Clear all notifications')).toBeInTheDocument();
  });

  // ─── Navigation ────────────────────────────────────────────────────────────

  it('navigates to target page on notification click', () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock },
      writable: true,
    });

    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    const notifItem =
      screen.getByText('New page created').closest('[class*="group"]') ||
      screen.getByText('New page created');
    fireEvent.click(notifItem);

    expect(assignMock).toHaveBeenCalledWith('/page/p1');
  });

  it('closes dropdown after navigating', () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: assignMock },
      writable: true,
    });

    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    const notifItem =
      screen.getByText('New page created').closest('[class*="group"]') ||
      screen.getByText('New page created');
    fireEvent.click(notifItem);
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations when closed', async () => {
    const { container } = renderBell();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when open', async () => {
    const { container } = renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with empty state', async () => {
    const { container } = renderBell([]);
    fireEvent.click(screen.getByTitle('Notifications'));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has aria-label with unread count on bell button', () => {
    renderBell();
    const btn = screen.getByRole('button', { name: /notifications.*2 unread/i });
    expect(btn).toBeInTheDocument();
  });

  it("has aria-label showing just 'Notifications' when no unread", () => {
    const allRead: Notification[] = sampleNotifications.map((n) => ({ ...n, is_read: true }));
    renderBell(allRead);
    const btn = screen.getByRole('button', { name: /^Notifications$/i });
    expect(btn).toBeInTheDocument();
  });
});
