import { describe, it, expect } from 'vitest';
import { isAttachmentUrl, getAttachmentId, MAX_IMAGE_BYTES } from '../lib/api';

describe('isAttachmentUrl', () => {
  it('returns true for attachment:// URLs', () => {
    expect(isAttachmentUrl('attachment://abc123')).toBe(true);
    expect(isAttachmentUrl('attachment://att_xyz_789')).toBe(true);
  });

  it('returns false for http/https URLs', () => {
    expect(isAttachmentUrl('https://example.com/image.png')).toBe(false);
    expect(isAttachmentUrl('http://example.com/image.png')).toBe(false);
  });

  it('returns false for data URIs', () => {
    expect(isAttachmentUrl('data:image/png;base64,iVBOR')).toBe(false);
  });

  it('returns false for empty strings', () => {
    expect(isAttachmentUrl('')).toBe(false);
  });
});

describe('getAttachmentId', () => {
  it('extracts the ID from attachment:// URLs', () => {
    expect(getAttachmentId('attachment://abc123')).toBe('abc123');
    expect(getAttachmentId('attachment://att_xyz')).toBe('att_xyz');
  });

  it('handles URLs with special characters', () => {
    expect(getAttachmentId('attachment://file-name_v1.2')).toBe('file-name_v1.2');
  });

  it('returns empty string for empty input', () => {
    expect(getAttachmentId('')).toBe('');
  });
});

describe('MAX_IMAGE_BYTES', () => {
  it('is 10 MB', () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
  });

  it('is a positive number', () => {
    expect(MAX_IMAGE_BYTES).toBeGreaterThan(0);
  });
});
