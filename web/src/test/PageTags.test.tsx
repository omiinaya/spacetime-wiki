import { describe, it, expect, vi, beforeEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockApi = vi.hoisted(() => ({
  tags: { list: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

vi.mock('../lib/api', () => ({ api: mockApi }));

import { PageTags } from '../components/PageTags';

const sampleTags = [
  { id: 'tag1', page_id: 'page1', name: 'important', value: '' },
  { id: 'tag2', page_id: 'page1', name: 'frontend', value: '' },
  { id: 'tag3', page_id: 'page1', name: 'bug', value: '' },
];

describe('PageTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve([{ rows: [['design'], ['frontend'], ['backend']] }]),
      ok: true,
    } as any);
  });

  it('returns null while tags are loading', () => {
    mockApi.tags.list.mockReturnValue(new Promise(() => {}));
    const { container } = render(<PageTags pageId="page1" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders tags after loading', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    render(<PageTags pageId="page1" />);
    await waitFor(() => {
      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('bug')).toBeInTheDocument();
    });
  });

  it('renders tags in read-only mode (no edit buttons)', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    render(<PageTags pageId="page1" editable={false} />);
    await waitFor(() => expect(screen.getByText('important')).toBeInTheDocument());
    expect(screen.queryByText(/Add tag/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button').length).toBe(0);
  });

  it('shows Add tag button when editable', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    render(<PageTags pageId="page1" editable={true} userId="user1" />);
    await waitFor(() => expect(screen.getByText(/Add tag/)).toBeInTheDocument());
  });

  it('shows remove buttons on tags when editable', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    render(<PageTags pageId="page1" editable={true} userId="user1" />);
    await waitFor(() => expect(screen.getByText('important')).toBeInTheDocument());
    const removeBtns = screen.getAllByRole('button');
    expect(removeBtns.length).toBeGreaterThanOrEqual(3);
  });

  it('removes a tag via remove button', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    mockApi.tags.remove.mockResolvedValue(undefined);
    render(<PageTags pageId="page1" editable={true} userId="user1" />);
    await waitFor(() => expect(screen.getByText('important')).toBeInTheDocument());
    mockApi.tags.list.mockResolvedValue(sampleTags.slice(1));
    const removeBtns = screen.getAllByRole('button');
    fireEvent.click(removeBtns[0]);
    await waitFor(() => expect(mockApi.tags.remove).toHaveBeenCalledWith('tag1'));
  });

  it('adds a tag via input and Enter', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    mockApi.tags.add.mockResolvedValue(undefined);
    render(<PageTags pageId="page1" editable={true} userId="user1" />);
    await waitFor(() => expect(screen.getByText(/Add tag/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Add tag/));
    const input = screen.getByPlaceholderText('Add tag...');
    expect(input).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'newtag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mockApi.tags.add).toHaveBeenCalledWith('page1', 'newtag', ''));
  });

  it('closes input on Escape', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    render(<PageTags pageId="page1" editable={true} userId="user1" />);
    await waitFor(() => expect(screen.getByText(/Add tag/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Add tag/));
    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Add tag...')).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/Add tag/)).toBeInTheDocument();
  });

  it('selects first suggestion on Enter', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    mockApi.tags.add.mockResolvedValue(undefined);
    render(<PageTags pageId="page1" editable={true} userId="user1" />);
    await waitFor(() => expect(screen.getByText(/Add tag/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Add tag/));
    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.change(input, { target: { value: 'd' } });
    await waitFor(() => expect(screen.getByText('design')).toBeInTheDocument());
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(mockApi.tags.add).toHaveBeenCalledWith('page1', 'design', ''));
  });

  it('does not show suggestions when input is empty', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    render(<PageTags pageId="page1" editable={true} userId="user1" />);
    await waitFor(() => expect(screen.getByText(/Add tag/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Add tag/));
    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.change(input, { target: { value: '' } });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('design')).not.toBeInTheDocument();
  });

  it('does not show editable controls when userId is null', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    render(<PageTags pageId="page1" editable={true} userId={null} />);
    await waitFor(() => expect(screen.getByText('important')).toBeInTheDocument());
    expect(screen.queryByText(/Add tag/)).not.toBeInTheDocument();
  });

  it('skips adding duplicate tags', async () => {
    mockApi.tags.list.mockResolvedValue(sampleTags);
    render(<PageTags pageId="page1" editable={true} userId="user1" />);
    await waitFor(() => expect(screen.getByText(/Add tag/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Add tag/));
    const input = screen.getByPlaceholderText('Add tag...');
    fireEvent.change(input, { target: { value: 'important' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockApi.tags.add).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    mockApi.tags.list.mockResolvedValue([]);
    const { container } = render(<PageTags pageId="page1" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
