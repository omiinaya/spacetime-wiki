import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { cn, formatDate, timeAgo } from '../lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'active')).toBe('base active');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a valid timestamp', () => {
    // 2024-01-15T12:00:00.000Z
    const ts = 1705320000000;
    const result = formatDate(ts);
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('returns empty string for falsy timestamps', () => {
    expect(formatDate(0)).toBe('');
    expect(formatDate(null as unknown as number)).toBe('');
    expect(formatDate(undefined as unknown as number)).toBe('');
  });
});

describe('timeAgo', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    // Pin "now" to 2024-06-15T12:00:00.000Z
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps < 60s ago', () => {
    const now = Date.now();
    expect(timeAgo(now)).toBe('just now');
    expect(timeAgo(now - 30_000)).toBe('just now');
  });

  it('returns minutes ago for timestamps < 60m ago', () => {
    const now = Date.now();
    expect(timeAgo(now - 120_000)).toBe('2m ago');
    expect(timeAgo(now - 3_540_000)).toBe('59m ago');
  });

  it('returns hours ago for timestamps < 24h ago', () => {
    const now = Date.now();
    expect(timeAgo(now - 3_600_000 * 3)).toBe('3h ago');
    expect(timeAgo(now - 3_600_000 * 23)).toBe('23h ago');
  });

  it('returns days ago for timestamps < 30d ago', () => {
    const now = Date.now();
    expect(timeAgo(now - 86_400_000 * 7)).toBe('7d ago');
    expect(timeAgo(now - 86_400_000 * 29)).toBe('29d ago');
  });

  it('falls back to formatted date for older timestamps', () => {
    const old = new Date('2024-01-15T12:00:00.000Z').getTime();
    // 152 days ago — more than 30
    expect(timeAgo(old)).toContain('Jan');
    expect(timeAgo(old)).toContain('15');
    expect(timeAgo(old)).toContain('2024');
  });

  it('returns empty string for falsy timestamps', () => {
    expect(timeAgo(0)).toBe('');
  });
});
