import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockAccessRequestApi = vi.hoisted(() => ({
  listPending: vi.fn(),
  approve: vi.fn(),
  deny: vi.fn(),
}));
const mockSqlQuery = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  accessRequestApi: mockAccessRequestApi,
  sqlQuery: mockSqlQuery,
}));

import AccessRequestPanel from '../components/AccessRequestPanel';

const pendingRequests = [
  {
    id: 'req1',
    page_id: 'page1',
    requester_id: 'u1',
    reason: 'I need to edit this page',
    status: 'pending',
    responded_by: '',
    responded_at: 0,
    created_at: 1700000000000,
  },
  {
    id: 'req2',
    page_id: 'page2',
    requester_id: 'u2',
    reason: '',
    status: 'pending',
    responded_by: '',
    responded_at: 0,
    created_at: 1699900000000,
  },
];

const approvedRequest = {
  id: 'req3',
  page_id: 'page3',
  requester_id: 'u3',
  reason: 'Please grant access',
  status: 'approved',
  responded_by: 'admin1',
  responded_at: 1700010000000,
  created_at: 1699800000000,
};

describe('AccessRequestPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading and description', () => {
    mockAccessRequestApi.listPending.mockResolvedValue([]);
    render(<AccessRequestPanel userId="admin1" />);
    expect(screen.getByText('Access Requests')).toBeInTheDocument();
    expect(screen.getByText(/Users requesting access/)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockAccessRequestApi.listPending.mockImplementation(() => new Promise(() => {}));
    render(<AccessRequestPanel userId="admin1" />);
    expect(screen.getByText('Loading access requests...')).toBeInTheDocument();
  });

  it('shows empty state when no pending requests', async () => {
    mockAccessRequestApi.listPending.mockResolvedValue([]);
    render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText('No pending access requests')).toBeInTheDocument();
    });
  });

  it('renders pending requests with enriched data', async () => {
    mockAccessRequestApi.listPending.mockResolvedValue(pendingRequests);
    // Use implementation that inspects SQL to handle interleaved parallel calls
    mockSqlQuery.mockImplementation((sql: string) => {
      if (sql.includes('My Document') || (sql.includes('title FROM') && sql.includes('page1')))
        return Promise.resolve([{ title: 'My Document' }]);
      if (sql.includes('Other Page') || (sql.includes('title FROM') && sql.includes('page2')))
        return Promise.resolve([{ title: 'Other Page' }]);
      if (sql.includes('Alice') || (sql.includes('name FROM') && sql.includes('u1')))
        return Promise.resolve([{ name: 'Alice' }]);
      if (sql.includes('Bob') || (sql.includes('name FROM') && sql.includes('u2')))
        return Promise.resolve([{ name: 'Bob' }]);
      return Promise.resolve([]);
    });
    render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
    expect(screen.getByText(/Page: My Document/)).toBeInTheDocument();
    expect(screen.getByText(/I need to edit this page/)).toBeInTheDocument();
    expect(screen.getAllByTitle('Approve access')).toHaveLength(2);
    expect(screen.getAllByTitle('Deny access')).toHaveLength(2);
  });

  it('calls approve handler on click', async () => {
    mockAccessRequestApi.listPending.mockResolvedValue([pendingRequests[0]]);
    mockAccessRequestApi.approve.mockResolvedValue(undefined);
    mockSqlQuery.mockImplementation((sql: string) => {
      if (sql.includes('page1')) return Promise.resolve([{ title: 'Doc' }]);
      if (sql.includes('u1')) return Promise.resolve([{ name: 'Alice' }]);
      return Promise.resolve([]);
    });
    render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Approve access'));
    await waitFor(() => {
      expect(mockAccessRequestApi.approve).toHaveBeenCalledWith('req1', 'admin1');
    });
  });

  it('calls deny handler on click', async () => {
    mockAccessRequestApi.listPending.mockResolvedValue([pendingRequests[0]]);
    mockAccessRequestApi.deny.mockResolvedValue(undefined);
    mockSqlQuery.mockImplementation((sql: string) => {
      if (sql.includes('page1')) return Promise.resolve([{ title: 'Doc' }]);
      if (sql.includes('u1')) return Promise.resolve([{ name: 'Alice' }]);
      return Promise.resolve([]);
    });
    render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Deny access'));
    await waitFor(() => {
      expect(mockAccessRequestApi.deny).toHaveBeenCalledWith('req1', 'admin1');
    });
  });

  it('shows approved status without action buttons', async () => {
    mockAccessRequestApi.listPending.mockResolvedValue([approvedRequest]);
    mockSqlQuery.mockImplementation((sql: string) => {
      if (sql.includes('page3')) return Promise.resolve([{ title: 'Approved Doc' }]);
      if (sql.includes('u3')) return Promise.resolve([{ name: 'Charlie' }]);
      return Promise.resolve([]);
    });
    render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => expect(screen.getByText('Charlie')).toBeInTheDocument());
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.queryByTitle('Approve access')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Deny access')).not.toBeInTheDocument();
  });

  it('handles approve API error gracefully', async () => {
    mockAccessRequestApi.listPending.mockResolvedValue([pendingRequests[0]]);
    mockAccessRequestApi.approve.mockRejectedValue(new Error('Reducer failed'));
    mockSqlQuery.mockImplementation((sql: string) => {
      if (sql.includes('page1')) return Promise.resolve([{ title: 'Doc' }]);
      if (sql.includes('u1')) return Promise.resolve([{ name: 'Alice' }]);
      return Promise.resolve([]);
    });
    render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Approve access'));
    await waitFor(() => expect(screen.getByText('Reducer failed')).toBeInTheDocument());
  });

  it('handles listPending API error gracefully', async () => {
    mockAccessRequestApi.listPending.mockRejectedValue(new Error('Network error'));
    render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });

  it('shows fallback names when enrichment fails', async () => {
    mockAccessRequestApi.listPending.mockResolvedValue([pendingRequests[0]]);
    // Both enrichment queries fail
    mockSqlQuery.mockRejectedValue(new Error('Not found'));
    render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => {
      expect(screen.getByText(/Page: Unknown page/)).toBeInTheDocument();
    });
    // Fallback name is "Unknown user" (not requester_id since string is truthy)
    expect(screen.getByText('Unknown user')).toBeInTheDocument();
  });

  it('handles null userId gracefully', async () => {
    render(<AccessRequestPanel userId={null} />);
    expect(mockAccessRequestApi.listPending).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('No pending access requests')).toBeInTheDocument();
    });
  });

  it('refresh button works', async () => {
    mockAccessRequestApi.listPending.mockResolvedValue([]);
    render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => expect(screen.getByText('No pending access requests')).toBeInTheDocument());
    mockAccessRequestApi.listPending.mockResolvedValue([pendingRequests[0]]);
    mockSqlQuery.mockImplementation((sql: string) => {
      if (sql.includes('page1')) return Promise.resolve([{ title: 'Doc' }]);
      if (sql.includes('u1')) return Promise.resolve([{ name: 'Alice' }]);
      return Promise.resolve([]);
    });
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  });

  it('has no accessibility violations', async () => {
    mockAccessRequestApi.listPending.mockResolvedValue([]);
    const { container } = render(<AccessRequestPanel userId="admin1" />);
    await waitFor(() => expect(screen.getByText('No pending access requests')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
