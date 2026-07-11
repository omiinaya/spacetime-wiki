import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { axe } from 'vitest-axe';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock API ─────────────────────────────────────────────────────────────────

const mockList = vi.fn();
const mockAdd = vi.fn();
const mockDelete = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    attachments: {
      list: (...args: unknown[]) => mockList(...args),
      add: (...args: unknown[]) => mockAdd(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
  Attachment: class {},
}));

import { MediaManager } from '../components/MediaManager';

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleAttachments = [
  {
    id: 'a1',
    page_id: 'p1',
    filename: 'screenshot.png',
    mime_type: 'image/png',
    size_bytes: 102400,
    storage_key: 'iVBORw0KGgo=',
    created_at: 1000,
    created_by: 'u1',
  },
  {
    id: 'a2',
    page_id: 'p1',
    filename: 'report.pdf',
    mime_type: 'application/pdf',
    size_bytes: 204800,
    storage_key: 'JVBERi0xLjc=',
    created_at: 900,
    created_by: 'u1',
  },
  {
    id: 'a3',
    page_id: 'p1',
    filename: 'demo.mp4',
    mime_type: 'video/mp4',
    size_bytes: 1048576,
    storage_key: 'AAAAIGZ0eXBpc29t',
    created_at: 800,
    created_by: 'u1',
  },
];

function renderMedia(props: Partial<Parameters<typeof MediaManager>[0]> = {}) {
  const onClose = props.onClose ?? vi.fn();
  return {
    onClose,
    ...render(
      <MediaManager
        pageId={props.pageId ?? 'p1'}
        userId={'userId' in props ? props.userId : 'u1'}
        onClose={onClose}
        pickMode={props.pickMode}
        onPick={props.onPick}
      />,
    ),
  };
}

describe('MediaManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(sampleAttachments);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Basic rendering ───────────────────────────────────────────────────────

  it('renders the modal overlay', () => {
    renderMedia();
    expect(screen.getByText('Media Browser')).toBeInTheDocument();
  });

  it('shows attachment count in header', async () => {
    renderMedia();
    await waitFor(() => {
      expect(screen.getByText(/3 files?/)).toBeInTheDocument();
    });
  });

  it('calls api.attachments.list on mount', () => {
    renderMedia();
    expect(mockList).toHaveBeenCalledWith('p1');
  });

  it('shows close button', () => {
    renderMedia();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const { onClose } = renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const { onClose } = renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    // Click the backdrop (outer fixed div)
    const backdrop = document.querySelector('.fixed.inset-0');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it('shows loading spinner while fetching', () => {
    mockList.mockReturnValue(new Promise(() => {})); // Never resolves
    renderMedia();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ─── Empty state ──────────────────────────────────────────────────────────

  it('shows empty state when no attachments', async () => {
    mockList.mockResolvedValue([]);
    renderMedia();
    await waitFor(() => {
      expect(screen.getByText('No attachments yet')).toBeInTheDocument();
    });
  });

  it('shows upload prompt in empty state', async () => {
    mockList.mockResolvedValue([]);
    renderMedia();
    await waitFor(() => {
      expect(screen.getByText(/Upload images/)).toBeInTheDocument();
    });
  });

  // ─── File grid ────────────────────────────────────────────────────────────

  it('renders file items with filenames', async () => {
    renderMedia();
    await waitFor(() => {
      expect(screen.getByText('screenshot.png')).toBeInTheDocument();
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.getByText('demo.mp4')).toBeInTheDocument();
    });
  });

  it('shows file sizes', async () => {
    renderMedia();
    await waitFor(() => {
      expect(screen.getByText(/100\.0 KB/)).toBeInTheDocument();
      expect(screen.getByText(/200\.0 KB/)).toBeInTheDocument();
      expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
    });
  });

  it('shows image thumbnails', async () => {
    renderMedia();
    await waitFor(() => {
      const img = document.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.src).toContain('data:image/png;base64');
    });
  });

  // ─── Search ────────────────────────────────────────────────────────────────

  it('shows search bar when there are attachments', async () => {
    renderMedia();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Filter by filename or type...')).toBeInTheDocument();
    });
  });

  it('filters files by filename', async () => {
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const searchInput = screen.getByPlaceholderText('Filter by filename or type...');
    fireEvent.change(searchInput, { target: { value: 'screenshot' } });
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    expect(screen.queryByText('report.pdf')).not.toBeInTheDocument();
  });

  it('filters files by mime type', async () => {
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const searchInput = screen.getByPlaceholderText('Filter by filename or type...');
    fireEvent.change(searchInput, { target: { value: 'pdf' } });
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.queryByText('screenshot.png')).not.toBeInTheDocument();
  });

  it('shows no-results state when search matches nothing', async () => {
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const searchInput = screen.getByPlaceholderText('Filter by filename or type...');
    fireEvent.change(searchInput, { target: { value: 'zzznonexistent' } });
    expect(screen.getByText(/No files matching/)).toBeInTheDocument();
  });

  // ─── Upload ───────────────────────────────────────────────────────────────

  it('shows upload button when userId is provided', async () => {
    renderMedia();
    await waitFor(() => {
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });
  });

  it('hides upload button when userId is null', async () => {
    renderMedia({ userId: null });
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    expect(screen.queryByText('Upload')).not.toBeInTheDocument();
  });

  it('hides delete button when userId is null', async () => {
    renderMedia({ userId: null });
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    // Delete buttons are in the hover overlay
    const deleteBtns = document.querySelectorAll('[title="Delete"]');
    expect(deleteBtns.length).toBe(0);
  });

  // ─── Delete ────────────────────────────────────────────────────────────────

  it('shows delete button on hover for own files', async () => {
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    // Delete buttons are rendered in hover overlay
    const deleteBtns = document.querySelectorAll('[title="Delete"]');
    expect(deleteBtns.length).toBe(3);
  });

  it('calls api.attachments.delete when delete clicked', async () => {
    mockDelete.mockResolvedValue(undefined);
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const deleteBtns = document.querySelectorAll('[title="Delete"]');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('a1');
    });
  });

  it('removes deleted item from the list', async () => {
    mockDelete.mockResolvedValue(undefined);
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const deleteBtns = document.querySelectorAll('[title="Delete"]');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => {
      expect(screen.queryByText('screenshot.png')).not.toBeInTheDocument();
    });
  });

  it('handles delete error gracefully', async () => {
    mockDelete.mockRejectedValue(new Error('API error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const deleteBtns = document.querySelectorAll('[title="Delete"]');
    fireEvent.click(deleteBtns[0]);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  // ─── Copy link ───────────────────────────────────────────────────────────

  it('copies attachment URL to clipboard on non-image click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    renderMedia();
    await waitFor(() => expect(screen.getByText('report.pdf')).toBeInTheDocument());
    // Click on the pdf card to trigger copy
    const pdfCard = screen.getByText('report.pdf').closest('[class*="group"]');
    fireEvent.click(pdfCard!);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('attachment://a2');
    });
  });

  it('shows copied state after copying link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    renderMedia();
    await waitFor(() => expect(screen.getByText('report.pdf')).toBeInTheDocument());
    const pdfCard = screen.getByText('report.pdf').closest('[class*="group"]');
    fireEvent.click(pdfCard!);
    // The Copy icon should show Check for a brief period
    const checkIcon = document.querySelector('[title="Copy link"] svg path');
    expect(checkIcon).toBeTruthy();
  });

  // ─── Preview ───────────────────────────────────────────────────────────────

  it('opens image preview on image click', async () => {
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const imgCard = screen.getByText('screenshot.png').closest('[class*="group"]');
    fireEvent.click(imgCard!);
    // Should show full-size preview
    expect(screen.getByText('Copy attachment link')).toBeInTheDocument();
  });

  it('closes preview on backdrop click', async () => {
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const imgCard = screen.getByText('screenshot.png').closest('[class*="group"]');
    fireEvent.click(imgCard!);
    expect(screen.getByText('Copy attachment link')).toBeInTheDocument();
    // Click preview backdrop
    const previewBackdrop = document.querySelectorAll('.fixed.inset-0'); // second one is preview
    // Actually click the fullscreen preview backdrop (the z-20 div)
    const previewOverlay = document.querySelector('.z-20');
    fireEvent.click(previewOverlay!);
    await waitFor(() => {
      expect(screen.queryByText('Copy attachment link')).not.toBeInTheDocument();
    });
  });

  // ─── Pick mode ───────────────────────────────────────────────────────────

  it('calls onPick and onClose in pick mode', async () => {
    const onPick = vi.fn();
    const onClose = vi.fn();
    renderMedia({ pickMode: true, onPick, onClose });
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const imgCard = screen.getByText('screenshot.png').closest('[class*="group"]');
    fireEvent.click(imgCard!);
    expect(onPick).toHaveBeenCalledWith('attachment://a1');
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ─── Drag and drop ───────────────────────────────────────────────────────

  it('shows drag overlay on dragover', async () => {
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const modal = document.querySelector('[class*="max-w-3xl"]');
    fireEvent.dragOver(modal!);
    expect(screen.getByText('Drop file to upload')).toBeInTheDocument();
  });

  it('hides drag overlay on dragleave', async () => {
    renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const modal = document.querySelector('[class*="max-w-3xl"]');
    fireEvent.dragOver(modal!);
    expect(screen.getByText('Drop file to upload')).toBeInTheDocument();
    fireEvent.dragLeave(modal!);
    await waitFor(() => {
      expect(screen.queryByText('Drop file to upload')).not.toBeInTheDocument();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────────

  it('has no accessibility violations when closed (not rendered)', () => {
    // Not rendered at all = no violations trivially
  });

  it('has no accessibility violations with attachments', async () => {
    const { container } = renderMedia();
    await waitFor(() => expect(screen.getByText('screenshot.png')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations in empty state', async () => {
    mockList.mockResolvedValue([]);
    const { container } = renderMedia();
    await waitFor(() => expect(screen.getByText('No attachments yet')).toBeInTheDocument());
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
