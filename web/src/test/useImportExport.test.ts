import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { showToast } from '../components/Toast';
import { api } from '../lib/api';

// Mock the api module
vi.mock('../lib/api', () => ({
  api: {
    pages: {
      create: vi.fn(),
    },
    webhooks: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      fire: vi.fn(),
      listEvents: vi.fn(),
    },
  },
}));

// Mock showToast
vi.mock('../components/Toast', () => ({
  showToast: vi.fn(),
}));

// Mock JSZip
vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(),
  },
}));

const mockJSZip = vi.fn();

describe('useImportExport', () => {
  const userId = 'test-user';
  const onRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handleImportMD - successful import', async () => {
    // Dynamic import inside handleImportMD uses import('../lib/helpers')
    // We need to mock that dynamic import
    vi.mock('../lib/helpers', () => ({
      markdownToProseMirror: (text: string) => ({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ text }] }],
      }),
      htmlToProseMirror: (html: string) => ({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ text: html }] }],
      }),
    }));

    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    // Simulate a file input change event
    const file = new File(['# Hello'], 'hello.md', { type: 'text/markdown' });
    const event = {
      target: {
        files: [file],
        value: '',
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportMD(event);
    });

    expect(api.pages.create).toHaveBeenCalledWith('hello', expect.any(String), '', '', userId);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Imported' }),
    );
  });

  it('should handleImportMD - fail gracefully', async () => {
    vi.mocked(api.pages.create).mockRejectedValueOnce(new Error('API error'));

    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const file = new File(['test'], 'fail.md', { type: 'text/markdown' });
    const event = {
      target: {
        files: [file],
        value: '',
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportMD(event);
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Import failed' }),
    );
  });

  it('should handleImportNotion - import HTML file', async () => {
    const { htmlToProseMirror } = await import('../lib/helpers');
    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    // Mock htmlToProseMirror
    vi.mocked(htmlToProseMirror).mockReturnValue({ type: 'doc', content: [] });

    // Create an HTML file
    const file = new File(['<html><body><p>Test</p></body></html>'], 'test.html', {
      type: 'text/html',
    });
    const event = {
      target: {
        files: [file],
        value: '',
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportNotion(event);
    });

    expect(api.pages.create).toHaveBeenCalledWith('test', expect.any(String), '', '', userId);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Imported' }),
    );
  });

  it('should handleImportConfluence - fail gracefully when no file', async () => {
    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const event = {
      target: {
        files: [],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportConfluence(event);
    });

    // Should return early without calling fetch
    expect(showToast).not.toHaveBeenCalled();
  });

  it('should have correct refs and state', async () => {
    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    expect(result.current.importing).toBe(false);
    expect(result.current.importingNotion).toBe(false);
    expect(result.current.importingConfluence).toBe(false);
    expect(result.current.importRef.current).toBe(null);
    expect(result.current.notionImportRef.current).toBe(null);
    expect(result.current.confluenceImportRef.current).toBe(null);
  });
});
