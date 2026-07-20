import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { showToast } from '../components/Toast';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    pages: { create: vi.fn() },
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

vi.mock('../components/Toast', () => ({
  showToast: vi.fn(),
}));

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

// Create a mock JSZip
const mockZipInstance = {
  forEach: vi.fn(),
  file: vi.fn(),
};
const mockJSZip = {
  loadAsync: vi.fn(),
};
vi.mock('jszip', () => ({
  default: mockJSZip,
}));

describe('useImportExport', () => {
  const userId = 'test-user';
  const onRefresh = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('handleImportMD - successful markdown import', async () => {
    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const file = new File(['# Hello World'], 'hello-world.md', { type: 'text/markdown' });
    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportMD(event);
    });

    expect(api.pages.create).toHaveBeenCalledWith(
      'hello-world',
      expect.stringContaining('doc'),
      '',
      '',
      userId,
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Imported' }),
    );
    expect(result.current.importing).toBe(false);
  });

  it('handleImportMD - fail gracefully on api error', async () => {
    vi.mocked(api.pages.create).mockRejectedValueOnce(new Error('API error'));

    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const file = new File(['test'], 'fail.md', { type: 'text/markdown' });
    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportMD(event);
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Import failed' }),
    );
    expect(result.current.importing).toBe(false);
  });

  it('handleImportMD - no file returns early', async () => {
    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const event = {
      target: { files: [] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportMD(event);
    });

    expect(api.pages.create).not.toHaveBeenCalled();
    expect(result.current.importing).toBe(false);
  });

  it('handleImportNotion - single HTML file', async () => {
    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const file = new File(
      ['<html><body><p>Notion export</p></body></html>'],
      'notion-export.html',
      { type: 'text/html' },
    );
    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportNotion(event);
    });

    expect(api.pages.create).toHaveBeenCalledWith(
      'notion-export',
      expect.stringContaining('doc'),
      '',
      '',
      userId,
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Imported' }),
    );
    expect(result.current.importingNotion).toBe(false);
  });

  it('handleImportNotion - zip with markdown files', async () => {
    // Set up mock JSZip
    const entries: Record<string, { dir: boolean }> = {
      'page1.md': { dir: false },
      'sub/page2.md': { dir: false },
      'notes.txt': { dir: false }, // should be ignored
    };
    const forEachCallback = vi.fn((cb: (path: string, entry: { dir: boolean }) => void) => {
      for (const [path, entry] of Object.entries(entries)) {
        cb(path, entry);
      }
    });

    const mockZip = {
      forEach: forEachCallback,
      file: vi.fn((path: string) => {
        if (path === 'page1.md') return { async: () => '# Page 1' };
        if (path === 'sub/page2.md') return { async: () => '# Page 2 in subdir' };
        return null;
      }),
    };
    mockJSZip.loadAsync.mockResolvedValue(mockZip);

    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const file = new File([''], 'notion-export.zip', { type: 'application/zip' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(new ArrayBuffer(0)),
    });

    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportNotion(event);
    });

    expect(api.pages.create).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Wiki imported' }),
    );
    expect(result.current.importingNotion).toBe(false);
  });

  it('handleImportNotion - empty zip shows error', async () => {
    const mockZip = {
      forEach: vi.fn((cb: (path: string, entry: { dir: boolean }) => void) => {}),
      file: vi.fn(),
    };
    mockJSZip.loadAsync.mockResolvedValue(mockZip);

    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const file = new File([], 'empty.zip', { type: 'application/zip' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(new ArrayBuffer(0)),
    });

    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportNotion(event);
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'No pages found' }),
    );
    expect(result.current.importingNotion).toBe(false);
  });

  it('handleImportNotion - fails gracefully', async () => {
    mockJSZip.loadAsync.mockRejectedValueOnce(new Error('Corrupted zip'));

    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const file = new File([], 'bad.zip', { type: 'application/zip' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(new ArrayBuffer(0)),
    });

    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportNotion(event);
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Import failed' }),
    );
    expect(result.current.importingNotion).toBe(false);
  });

  it('handleImportConfluence - no file returns early', async () => {
    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const event = {
      target: { files: [] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportConfluence(event);
    });

    expect(showToast).not.toHaveBeenCalled();
    expect(result.current.importingConfluence).toBe(false);
  });

  it('handleImportConfluence - successful import', async () => {
    // Mock window.__API_BASE__ and global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ pages_created: 5 }),
    });
    vi.stubGlobal('fetch', mockFetch);
    (globalThis as Record<string, unknown>).__API_BASE__ = '/api/v1';
    (globalThis as Record<string, unknown>).__API_KEY__ = 'test-key';

    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const file = new File(['confluence data'], 'confluence-export.zip', {
      type: 'application/zip',
    });
    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportConfluence(event);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/import/confluence',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Confluence import complete' }),
    );
    expect(onRefresh).toHaveBeenCalled();
    expect(result.current.importingConfluence).toBe(false);
  });

  it('handleImportConfluence - fails gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server error'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const file = new File(['data'], 'fail.zip', { type: 'application/zip' });
    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportConfluence(event);
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Confluence import failed' }),
    );
    expect(result.current.importingConfluence).toBe(false);
  });

  it('returns correct initial state and refs', async () => {
    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    expect(result.current.importing).toBe(false);
    expect(result.current.importingNotion).toBe(false);
    expect(result.current.importingConfluence).toBe(false);
    expect(result.current.importRef.current).toBeNull();
    expect(result.current.notionImportRef.current).toBeNull();
    expect(result.current.confluenceImportRef.current).toBeNull();
  });

  it('sets importing state correctly during import', async () => {
    // Make api.pages.create hold until resolved
    let resolveCreate!: (v: unknown) => void;
    vi.mocked(api.pages.create).mockImplementation(
      () =>
        new Promise((res) => {
          resolveCreate = res;
        }),
    );

    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    expect(result.current.importing).toBe(false);

    const file = new File(['# Test'], 'test.md', { type: 'text/markdown' });
    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Start import
    act(() => {
      result.current.handleImportMD(event);
    });

    // Should be importing now - need a small delay for the microtask
    await new Promise((r) => setTimeout(r, 50));

    resolveCreate?.({});
    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.importing).toBe(false);
  });

  it('handles Notion HTML import', async () => {
    const userId = 'user-1';
    const onRefresh = vi.fn();
    const { useImportExport } = await import('../hooks/useImportExport');
    const { result } = renderHook(() => useImportExport(userId, onRefresh));

    const htmlContent = '<h1>Test</h1><p>HTML content</p>';
    const file = new File([htmlContent], 'notion_page.html', { type: 'text/html' });
    const event = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleImportNotion(event);
    });

    expect(api.pages.create).toHaveBeenCalledWith(
      'notion_page',
      expect.any(String),
      '',
      '',
      'user-1',
    );
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Imported' }),
    );
  });
});
