import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ─── Hoisted mock factories ───────────────────────────────────────────────────

const mockAuditList = vi.hoisted(() => vi.fn());
const mockSqlQuery = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock('../lib/api', () => ({
  auditApi: { list: mockAuditList },
  sqlQuery: mockSqlQuery,
}));

import ActivityView from '../pages/ActivityView';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleEvents = [
  {
    id: 'e1',
    event_type: 'page.create',
    actor_id: 'u1',
    target_id: 't1',
    target_name: 'Getting Started',
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
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderActivityView() {
  return render(
    <MemoryRouter initialEntries={['/activity']}>
      <Routes>
        <Route path="/activity" element={<ActivityView />} />
        <Route path="/" element={<div data-testid="home-view">Home</div>} />
        <Route path="/page/:id" element={<div data-testid="page-view">Page {':id'}</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ActivityView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Page structure
  // ═══════════════════════════════════════════════════════════════════════════

  describe('page structure', () => {
    it('renders the Activity heading', () => {
      mockAuditList.mockReturnValue(new Promise(() => {}));
      renderActivityView();
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });

    it('renders the Activity icon', () => {
      mockAuditList.mockReturnValue(new Promise(() => {}));
      const { container } = renderActivityView();
      // The History icon from lucide-react is in the heading
      const svg = container.querySelector('svg.h-6');
      expect(svg).toBeInTheDocument();
    });

    it('renders the description text', () => {
      mockAuditList.mockReturnValue(new Promise(() => {}));
      renderActivityView();
      expect(screen.getByText(/Recent changes across the wiki/)).toBeInTheDocument();
    });

    it("renders a 'Back to home' button", () => {
      mockAuditList.mockReturnValue(new Promise(() => {}));
      renderActivityView();
      expect(screen.getByText('Back to home')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ActivityFeed integration
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ActivityFeed integration', () => {
    it('passes limit=200 to auditApi.list', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderActivityView();
      await waitFor(() => {
        expect(mockAuditList).toHaveBeenCalledWith(200);
      });
    });

    it('renders events from the feed', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderActivityView();
      await waitFor(() => {
        expect(screen.getByText('"Getting Started"')).toBeInTheDocument();
        expect(screen.getByText('"Meeting Notes"')).toBeInTheDocument();
        expect(screen.getByText('"Old Draft"')).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching', () => {
      mockAuditList.mockReturnValue(new Promise(() => {})); // never resolves
      mockSqlQuery.mockResolvedValue([]);
      renderActivityView();
      expect(screen.getByText('Loading activity...')).toBeInTheDocument();
    });

    it('shows empty state when no events', async () => {
      mockAuditList.mockResolvedValue([]);
      mockSqlQuery.mockResolvedValue([]);
      renderActivityView();
      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });
    });

    it('shows error state when API fails', async () => {
      mockAuditList.mockRejectedValue(new Error('Network error'));
      mockSqlQuery.mockResolvedValue([]);
      renderActivityView();
      await waitFor(() => {
        expect(screen.getByText('Failed to load activity feed')).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Navigation — "Back to home" button
  // ═══════════════════════════════════════════════════════════════════════════

  describe('navigation', () => {
    it("navigates to / when 'Back to home' is clicked", async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderActivityView();
      await waitFor(() => {
        expect(screen.getByText('Back to home')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Back to home'));
      await waitFor(() => {
        expect(screen.getByTestId('home-view')).toBeInTheDocument();
      });
    });

    it('navigates to /page/:id when a page event is clicked', async () => {
      const onNavigateSpy = vi.fn();
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([]);
      renderActivityView();
      await waitFor(() => {
        expect(screen.getByText('"Getting Started"')).toBeInTheDocument();
      });
      const eventRow = screen.getByText('"Getting Started"').closest('div')!;
      fireEvent.click(eventRow);
      // The onNavigate from ActivityView navigates to /page/:id for page.* events
      // which should show the page-view route
      await waitFor(() => {
        expect(screen.getByTestId('page-view')).toBeInTheDocument();
      });
    });

    it('navigates to /?col=:id when a collection event is clicked', async () => {
      const collectionEvent = [
        {
          id: 'e4',
          event_type: 'collection.create',
          actor_id: 'u3',
          target_id: 'col-123',
          target_name: 'Engineering Wiki',
          metadata: '{}',
          created_at: 1_000_000,
        },
      ];
      // We need the Home route to be matched when navigating to /?col=col-123
      // Let's use a simpler approach — just verify onNavigate logic via the feed
      mockAuditList.mockResolvedValue(collectionEvent);
      mockSqlQuery.mockResolvedValue([]);
      const { container } = renderActivityView();
      await waitFor(() => {
        expect(screen.getByText('"Engineering Wiki"')).toBeInTheDocument();
      });
      const eventRow = screen.getByText('"Engineering Wiki"').closest('div')!;
      fireEvent.click(eventRow);
      // For collection events, ActivityView navigates to /?col=:colId
      // The Home route pattern "/" will match
      await waitFor(() => {
        expect(screen.getByTestId('home-view')).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessibility
  // ═══════════════════════════════════════════════════════════════════════════

  describe('accessibility', () => {
    it('has no accessibility violations in populated state', async () => {
      mockAuditList.mockResolvedValue(sampleEvents);
      mockSqlQuery.mockResolvedValue([
        ['u1', 'Alice'],
        ['u2', 'Bob'],
      ]);
      const { container } = renderActivityView();
      await waitFor(() => {
        expect(screen.getByText('"Getting Started"')).toBeInTheDocument();
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations in loading state', async () => {
      mockAuditList.mockReturnValue(new Promise(() => {}));
      mockSqlQuery.mockResolvedValue([]);
      const { container } = renderActivityView();
      await screen.findByText('Loading activity...');
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations in error state', async () => {
      mockAuditList.mockRejectedValue(new Error('fail'));
      mockSqlQuery.mockResolvedValue([]);
      const { container } = renderActivityView();
      await waitFor(() => {
        expect(screen.getByText('Failed to load activity feed')).toBeInTheDocument();
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations in empty state', async () => {
      mockAuditList.mockResolvedValue([]);
      mockSqlQuery.mockResolvedValue([]);
      const { container } = renderActivityView();
      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
