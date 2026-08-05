import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// vi.mock is hoisted, so use vi.hoisted for the factory variables
const mockSqlQuery = vi.hoisted(() => vi.fn());
vi.mock('../lib/api', () => ({
  sqlQuery: mockSqlQuery,
}));

import AdminDashboard from '../components/AdminDashboard';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    mockSqlQuery.mockImplementation(() => new Promise(() => {}));
    render(<AdminDashboard userId="admin1" />);
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('shows error state when sqlQuery fails', async () => {
    mockSqlQuery.mockRejectedValue(new Error('DB connection failed'));
    render(<AdminDashboard userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load wiki statistics/i)).toBeInTheDocument();
    });
    const retryBtn = screen.getByText('Retry');
    expect(retryBtn).toBeInTheDocument();
    mockSqlQuery.mockResolvedValue([]);
    fireEvent.click(retryBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Failed to load wiki statistics/i)).not.toBeInTheDocument();
    });
  });

  it('renders stat cards with zero values when no data exists', async () => {
    mockSqlQuery.mockResolvedValue([]);
    render(<AdminDashboard userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText('Total Pages')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Collections')).toBeInTheDocument();
      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('Attachments')).toBeInTheDocument();
    });
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(5);
  });

  it('renders with populated stats', async () => {
    mockSqlQuery
      .mockResolvedValueOnce([[42]])
      .mockResolvedValueOnce([[8]])
      .mockResolvedValueOnce([[3]])
      .mockResolvedValueOnce([[156]])
      .mockResolvedValueOnce([[27]])
      .mockResolvedValueOnce([[30]])
      .mockResolvedValueOnce([[10]])
      .mockResolvedValueOnce([[2]])
      .mockResolvedValueOnce([[5]])
      .mockResolvedValueOnce([[10485760]])
      .mockResolvedValueOnce([['u1'], ['u2'], ['u3']])
      .mockResolvedValueOnce([
        ['u1', 'Alice'],
        ['u2', 'Bob'],
        ['u3', 'Charlie'],
      ])
      .mockResolvedValueOnce([]);
    render(<AdminDashboard userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('156')).toBeInTheDocument();
      expect(screen.getByText('27')).toBeInTheDocument();
    });
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft / Private')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.getByText('Deleted (trash)')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    const storageMentions = screen.getAllByText(/10\.0 MB/);
    expect(storageMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'No pages created yet' when contributors empty", async () => {
    mockSqlQuery
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[1]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    render(<AdminDashboard userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText('No pages created yet.')).toBeInTheDocument();
    });
  });

  it("shows 'No activity recorded yet' when activity empty", async () => {
    mockSqlQuery
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[1]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    render(<AdminDashboard userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText('No activity recorded yet.')).toBeInTheDocument();
    });
  });

  it('renders recent activity items', async () => {
    mockSqlQuery
      .mockResolvedValueOnce([[5]])
      .mockResolvedValueOnce([[1]])
      .mockResolvedValueOnce([[2]])
      .mockResolvedValueOnce([[3]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[4]])
      .mockResolvedValueOnce([[1]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([[0]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        ['e1', 'page.create', 'u1', 'My Page', 1700000000],
        ['e2', 'comment.create', 'u2', 'Other Page', 1699900000],
      ]);
    render(<AdminDashboard userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText('My Page')).toBeInTheDocument();
      expect(screen.getByText('Other Page')).toBeInTheDocument();
    });
    expect(screen.getByText('created page')).toBeInTheDocument();
    expect(screen.getByText('commented on')).toBeInTheDocument();
  });

  it('has correct section headings', async () => {
    mockSqlQuery.mockResolvedValue([]);
    render(<AdminDashboard userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText('Total Pages')).toBeInTheDocument();
    });
    expect(screen.getByText('Page Status Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Top Contributors')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mockSqlQuery.mockResolvedValue([]);
    const { container } = render(<AdminDashboard userId="admin1" />);
    await waitFor(() => expect(screen.getByText('Total Pages')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
