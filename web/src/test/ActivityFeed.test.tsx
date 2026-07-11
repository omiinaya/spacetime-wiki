import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Plus, Trash2, Edit3, Activity, FileText, Archive, RotateCcw } from 'lucide-react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockAuditList = vi.hoisted(() => vi.fn());
const mockSqlQuery = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock('../lib/api', () => ({
  auditApi: { list: mockAuditList },
  sqlQuery: mockSqlQuery,
}));

import {
  ActivityFeed,
  getEventIcon,
  getEventLabel,
  getEventColor,
  getActorName,
} from '../components/ActivityFeed';
import type { AuditEvent } from '../lib/api';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleEvents: AuditEvent[] = [
  {
    id: 'e1',
    event_type: 'page.create',
    actor_id: 'u1',
    target_id: 't1',
    target_name: 'Welcome Page',
    metadata: '{}',
    created_at: 1_000_000,
  },
  {
    id: 'e2',
    event_type: 'page.update',
    actor_id: 'u2',
    target_id: 't2',
    target_name: 'Meeting Notes',
    metadata: '{}',
    created_at: 900_000,
  },
  {
    id: 'e3',
    event_type: 'page.delete',
    actor_id: 'u1',
    target_id: 't3',
    target_name: 'Old Draft',
    metadata: '{}',
    created_at: 800_000,
  },
  {
    id: 'e4',
    event_type: 'collection.create',
    actor_id: 'u3',
    target_id: 't4',
    target_name: 'Engineering Wiki',
    metadata: '{}',
    created_at: 700_000,
  },
  {
    id: 'e5',
    event_type: 'comment.create',
    actor_id: 'u2',
    target_id: 't5',
    target_name: 'Great work!',
    metadata: '{}',
    created_at: 600_000,
  },
  {
    id: 'e6',
    event_type: 'user.role_change',
    actor_id: 'u4',
    target_id: 't6',
    target_name: 'Admin',
    metadata: '{}',
    created_at: 500_000,
  },
];

const eventNoTarget: AuditEvent = {
  id: 'e7',
  event_type: 'page.create',
  actor_id: 'u1',
  target_id: '',
  target_name: 'Orphan Page',
  metadata: '{}',
  created_at: 400_000,
};

// ─── Render helper ────────────────────────────────────────────────────────────

function renderFeed(overrides?: {
  compact?: boolean;
  limit?: number;
  onNavigate?: ReturnType<typeof vi.fn>;
}) {
  const onNavigate = overrides?.onNavigate ?? undefined;
  return {
    onNavigate,
    ...render(
      <ActivityFeed
        compact={overrides?.compact ?? false}
        limit={overrides?.limit ?? 50}
        onNavigate={onNavigate}
      />,
    ),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Pure helper functions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getEventIcon', () => {
    it('returns Plus for page.create', () => {
      expect(getEventIcon('page.create')).toBe(Plus);
    });

    it('returns Edit3 for page.update', () => {
      expect(getEventIcon('page.update')).toBe(Edit3);
    });

    it('returns Trash2 for page.delete', () => {
      expect(getEventIcon('page.delete')).toBe(Trash2);
    });

    it('returns RotateCcw for page.restore', () => {
      expect(getEventIcon('page.restore')).toBe(RotateCcw);
    });

    it('returns FileText for page.publish', () => {
      expect(getEventIcon('page.publish')).toBe(FileText);
    });

    it('returns Archive for page.archive', () => {
      expect(getEventIcon('page.archive')).toBe(Archive);
    });

    it('returns Activity for unknown event type', () => {
      expect(getEventIcon('unknown.type')).toBe(Activity);
    });

    it('returns Activity for empty string', () => {
      expect(getEventIcon('')).toBe(Activity);
    });
  });

  describe('getEventLabel', () => {
    it('returns "created page" for page.create', () => {
      expect(getEventLabel('page.create')).toBe('created page');
    });

    it('returns "updated page" for page.update', () => {
      expect(getEventLabel('page.update')).toBe('updated page');
    });

    it('returns "deleted page" for page.delete', () => {
      expect(getEventLabel('page.delete')).toBe('deleted page');
    });

    it('returns "created collection" for collection.create', () => {
      expect(getEventLabel('collection.create')).toBe('created collection');
    });

    it('returns "registered user" for user.create', () => {
      expect(getEventLabel('user.create')).toBe('registered user');
    });

    it('returns the event_type itself for unknown types', () => {
      expect(getEventLabel('custom.event')).toBe('custom.event');
    });
  });

  describe('getEventColor', () => {
    it('returns "text-red-500" for delete events', () => {
      expect(getEventColor('page.delete')).toBe('text-red-500');
      expect(getEventColor('comment.delete')).toBe('text-red-500');
      expect(getEventColor('group.delete')).toBe('text-red-500');
      expect(getEventColor('collection.delete')).toBe('text-red-500');
    });

    it('returns "text-green-500" for create and restore events', () => {
      expect(getEventColor('page.create')).toBe('text-green-500');
      expect(getEventColor('page.restore')).toBe('text-green-500');
      expect(getEventColor('collection.create')).toBe('text-green-500');
      expect(getEventColor('user.create')).toBe('text-green-500');
    });

    it('returns "text-blue-500" for update and publish events', () => {
      expect(getEventColor('page.update')).toBe('text-blue-500');
      expect(getEventColor('page.publish')).toBe('text-blue-500');
    });

    it('returns "text-yellow-500" for archive and status_change events', () => {
      expect(getEventColor('page.archive')).toBe('text-yellow-500');
      expect(getEventColor('page.status_change')).toBe('text-yellow-500');
    });

    it('returns "text-gray-400" for unknown event types', () => {
      expect(getEventColor('unknown.type')).toBe('text-gray-400');
    });
  });

  describe('getActorName', () => {
    const map: Record<string, string> = {
      u1: 'Alice',
      u2: 'Bob',
    };

    it('returns display name when actorId is found in map', () => {
      expect(getActorName(map, 'u1')).toBe('Alice');
      expect(getActorName(map, 'u2')).toBe('Bob');
    });

    it('returns truncated ID when actorId is not in map', () => {
      const longId = 'abcdef1234567890abcdef';
      expect(getActorName(map, longId)).toBe('abcdef123456...');
    });

    it('handles empty map gracefully', () => {
      expect(getActorName({}, 'u1')).toBe('u1...');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Component rendering — loading state
  // ═══════════════════════════════════════════════════════════════════════════

  describe('loading state', () => {
    it('shows loading indicator while auditApi.list is pending', () => {
      mockAuditList.mockReturnValue(new Promise(() => {})); // never resolves
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      expect(screen.getByText('Loading activity...')).toBeInTheDocument();
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Component rendering — error state
  // ═══════════════════════════════════════════════════════════════════════════

  describe('error state', () => {
    it('shows error message when auditApi.list rejects', async () => {
      mockAuditList.mockRejectedValue(new Error('Network failure'));
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('Failed to load activity feed')).toBeInTheDocument();
      });
    });

    it("shows a 'Try again' button on error", async () => {
      mockAuditList.mockRejectedValue(new Error('fail'));
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it("calls auditApi.list again when 'Try again' is clicked", async () => {
      mockAuditList.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Try again'));
      await waitFor(() => {
        expect(mockAuditList).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Component rendering — empty state
  // ═══════════════════════════════════════════════════════════════════════════

  describe('empty state', () => {
    it('shows empty message when no events returned', async () => {
      mockAuditList.mockResolvedValue([]);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });
    });

    it('shows helper text explaining where events come from', async () => {
      mockAuditList.mockResolvedValue([]);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(
          screen.getByText(/Activity will appear here as pages are created, updated, or deleted/),
        ).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Component rendering — event list
  // ═══════════════════════════════════════════════════════════════════════════

  describe('event list', () => {
    it('renders all events returned from auditApi.list', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([
        ['u1', 'Alice'],
        ['u2', 'Bob'],
        ['u3', 'Charlie'],
        ['u4', 'Diana'],
      ]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('"Welcome Page"')).toBeInTheDocument();
        expect(screen.getByText('"Meeting Notes"')).toBeInTheDocument();
        expect(screen.getByText('"Old Draft"')).toBeInTheDocument();
        expect(screen.getByText('"Engineering Wiki"')).toBeInTheDocument();
        expect(screen.getByText('"Great work!"')).toBeInTheDocument();
        expect(screen.getByText('"Admin"')).toBeInTheDocument();
      });
    });

    it('shows event count in header', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('6 events')).toBeInTheDocument();
      });
    });

    it("shows singular 'event' count for a single event", async () => {
      mockAuditList.mockResolvedValue([sampleEvents[0]]);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('1 event')).toBeInTheDocument();
      });
    });

    it('renders actor names from usernameMap', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([
        ['u1', 'Alice'],
        ['u2', 'Bob'],
        ['u3', 'Charlie'],
        ['u4', 'Diana'],
      ]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getAllByText('Alice')).toHaveLength(2);
        expect(screen.getAllByText('Bob')).toHaveLength(2);
        expect(screen.getByText('Charlie')).toBeInTheDocument();
        expect(screen.getByText('Diana')).toBeInTheDocument();
      });
    });

    it('renders truncated actor ID when username not found', async () => {
      const eventsWithUnknownActor: AuditEvent[] = [
        { ...sampleEvents[0], actor_id: 'unknown_actor_id_12345' },
      ];
      mockAuditList.mockResolvedValue(eventsWithUnknownActor);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('unknown_acto...')).toBeInTheDocument();
      });
    });

    it('renders event-type badges with stripped prefix', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getAllByText('create')).toHaveLength(3); // page, collection, comment
        expect(screen.getByText('update')).toBeInTheDocument();
        expect(screen.getByText('delete')).toBeInTheDocument();
        expect(screen.getByText('role_change')).toBeInTheDocument();
      });
    });

    it('calls auditApi.list with the correct limit', async () => {
      mockAuditList.mockResolvedValue([]);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed({ limit: 25 });
      await waitFor(() => {
        expect(mockAuditList).toHaveBeenCalledWith(25);
      });
    });

    it('caps limit at 200 for auditApi.list call', async () => {
      mockAuditList.mockResolvedValue([]);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed({ limit: 500 });
      await waitFor(() => {
        expect(mockAuditList).toHaveBeenCalledWith(200);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-refresh toggle
  // ═══════════════════════════════════════════════════════════════════════════

  describe('auto-refresh toggle', () => {
    it("shows 'Auto-refresh ON' by default", async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('Auto-refresh ON')).toBeInTheDocument();
      });
    });

    it("toggles to 'Auto-refresh OFF' when clicked", async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('Auto-refresh ON')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Auto-refresh ON'));
      expect(screen.getByText('Auto-refresh OFF')).toBeInTheDocument();
    });

    it('toggles back to ON after being OFF', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('Auto-refresh ON')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Auto-refresh ON'));
      expect(screen.getByText('Auto-refresh OFF')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Auto-refresh OFF'));
      expect(screen.getByText('Auto-refresh ON')).toBeInTheDocument();
    });

    it('applies green styling when ON and gray when OFF', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('Auto-refresh ON')).toBeInTheDocument();
      });
      const onBtn = screen.getByText('Auto-refresh ON');
      expect(onBtn.className).toContain('text-green-400');
      fireEvent.click(onBtn);
      const offBtn = screen.getByText('Auto-refresh OFF');
      expect(offBtn.className).toContain('text-gray-500');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Click navigation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('click navigation', () => {
    it('calls onNavigate with target_id and event_type when event is clicked', async () => {
      const onNavigate = vi.fn();
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed({ onNavigate });
      await waitFor(() => {
        expect(screen.getByText('"Welcome Page"')).toBeInTheDocument();
      });
      const eventRow = screen.getByText('"Welcome Page"').closest('div')!;
      fireEvent.click(eventRow);
      expect(onNavigate).toHaveBeenCalledWith('t1', 'page.create');
    });

    it('does not call onNavigate when event has no target_id', async () => {
      const onNavigate = vi.fn();
      mockAuditList.mockResolvedValue([eventNoTarget]);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed({ onNavigate });
      await waitFor(() => {
        expect(screen.getByText('"Orphan Page"')).toBeInTheDocument();
      });
      const eventRow = screen.getByText('"Orphan Page"').closest('div')!;
      fireEvent.click(eventRow);
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('does nothing when onNavigate is not provided', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(screen.getByText('"Welcome Page"')).toBeInTheDocument();
      });
      const eventRow = screen.getByText('"Welcome Page"').closest('div')!;
      expect(eventRow.className).not.toContain('cursor-pointer');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Compact mode
  // ═══════════════════════════════════════════════════════════════════════════

  describe('compact mode', () => {
    it('adds max-h and scroll when compact=true', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed({ compact: true });
      await waitFor(() => {
        expect(screen.getByText('6 events')).toBeInTheDocument();
      });
      const container = screen.getByText('6 events').closest('div')!;
      // The parent of the toggle bar is the outer container with the compact classes
      const outer = container.parentElement;
      expect(outer?.className).toContain('max-h-[60vh]');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Username loading
  // ═══════════════════════════════════════════════════════════════════════════

  describe('username loading', () => {
    it('calls sqlQuery to load usernames on mount', async () => {
      mockAuditList.mockResolvedValue([]);
      mockSqlQuery.mockResolvedValue([]);
      renderFeed();
      await waitFor(() => {
        expect(mockSqlQuery).toHaveBeenCalledWith('SELECT id, name FROM user');
      });
    });
  });
});
