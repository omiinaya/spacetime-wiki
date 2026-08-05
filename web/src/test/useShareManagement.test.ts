import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShareManagement } from '../hooks/useShareManagement';

const mockShareList = vi.fn();
const mockShareCreate = vi.fn();
const mockShareDelete = vi.fn();
const mockShareUpdateBranding = vi.fn();
vi.mock('../lib/api', () => ({
  api: {
    shareLinks: {
      list: (...a: unknown[]) => mockShareList(...a),
      create: (...a: unknown[]) => mockShareCreate(...a),
      delete: (...a: unknown[]) => mockShareDelete(...a),
      updateBranding: (...a: unknown[]) => mockShareUpdateBranding(...a),
    },
  },
}));

import { useShareManagement as importedUseShareManagement } from '../hooks/useShareManagement';

const sampleLink = {
  id: 'sl1',
  token: 'tok123',
  expires_at: 0,
  visit_count: 2,
  password_hash: '',
  brand_title: null,
  brand_logo_url: null,
};

describe('useShareManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShareList.mockResolvedValue([sampleLink]);
    mockShareCreate.mockResolvedValue({ token: 'newtok' });
    mockShareDelete.mockResolvedValue(undefined);
    mockShareUpdateBranding.mockResolvedValue(undefined);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  function setup() {
    return renderHook(() => importedUseShareManagement('u1'));
  }

  it('openShareDialog loads links and opens dialog', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.openShareDialog('p1', 'My Page');
    });
    expect(mockShareList).toHaveBeenCalledWith('p1');
    expect(result.current.shareDialog).toEqual({ pageId: 'p1', pageTitle: 'My Page' });
    expect(result.current.shareLinks).toHaveLength(1);
    expect(result.current.shareLoading).toBe(false);
  });

  it('openShareDialog resets password/days/url', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.openShareDialog('p1', 'My Page');
    });
    expect(result.current.sharePassword).toBe('');
    expect(result.current.shareDays).toBe(0);
    expect(result.current.shareUrl).toBe('');
  });

  it('createShare builds the share URL and reloads links', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.openShareDialog('p1', 'My Page');
    });
    act(() => result.current.setSharePassword('secret'));
    act(() => result.current.setShareDays(7));
    await act(async () => {
      await result.current.createShare();
    });
    expect(mockShareCreate).toHaveBeenCalledWith('p1', 'secret', 'u1', 7);
    expect(result.current.shareUrl).toContain('/shared/newtok');
    expect(mockShareList).toHaveBeenCalledTimes(2);
  });

  it('createShare no-ops without an open dialog', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.createShare();
    });
    expect(mockShareCreate).not.toHaveBeenCalled();
  });

  it('deleteShare deletes and reloads the list', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.openShareDialog('p1', 'My Page');
    });
    await act(async () => {
      await result.current.deleteShare('sl1');
    });
    expect(mockShareDelete).toHaveBeenCalledWith('sl1');
    expect(mockShareList).toHaveBeenCalledTimes(2);
  });

  it('updateShareBranding sets title/logo and reloads', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.openShareDialog('p1', 'My Page');
    });
    act(() => result.current.openBrandingEditor(sampleLink));
    expect(result.current.editBrandShareId).toBe('sl1');
    act(() => result.current.setEditBrandTitle('Brand'));
    act(() => result.current.setEditBrandLogoUrl('https://logo'));
    await act(async () => {
      await result.current.updateShareBranding('sl1');
    });
    expect(mockShareUpdateBranding).toHaveBeenCalledWith('sl1', 'Brand', 'https://logo');
    expect(result.current.editBrandShareId).toBeNull();
    expect(mockShareList).toHaveBeenCalledTimes(2);
  });

  it('updateShareBranding sends null when fields blank', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.openShareDialog('p1', 'My Page');
    });
    act(() => result.current.openBrandingEditor(sampleLink));
    await act(async () => {
      await result.current.updateShareBranding('sl1');
    });
    expect(mockShareUpdateBranding).toHaveBeenCalledWith('sl1', null, null);
  });

  it('createShare alerts on failure', async () => {
    mockShareCreate.mockRejectedValue(new Error('boom'));
    const { result } = setup();
    await act(async () => {
      await result.current.openShareDialog('p1', 'My Page');
    });
    await act(async () => {
      await result.current.createShare();
    });
    expect(window.alert).toHaveBeenCalledWith('Error: boom');
  });

  it('updateShareBranding alerts on failure', async () => {
    mockShareUpdateBranding.mockRejectedValue(new Error('fail'));
    const { result } = setup();
    await act(async () => {
      await result.current.openShareDialog('p1', 'My Page');
    });
    act(() => result.current.openBrandingEditor(sampleLink));
    await act(async () => {
      await result.current.updateShareBranding('sl1');
    });
    expect(window.alert).toHaveBeenCalledWith('Error: fail');
  });
});
