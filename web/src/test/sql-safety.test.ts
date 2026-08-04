import { describe, it, expect } from 'vitest';
import { sqlLit, sqlInt } from '../lib/api/client';

// ═══════════════════════════════════════════════════════════════════════════════
// sqlLit — SQL string-literal escaping (SQL injection defense)
// ═══════════════════════════════════════════════════════════════════════════════

describe('sqlLit', () => {
  it('wraps a plain value in single quotes', () => {
    expect(sqlLit('hello')).toBe("'hello'");
  });

  it('escapes single quotes by doubling them', () => {
    expect(sqlLit("O'Brien")).toBe("'O''Brien'");
  });

  it("escapes a classic SQL-injection payload so it can't break out", () => {
    const payload = "' OR '1'='1' --";
    expect(sqlLit(payload)).toBe("''' OR ''1''=''1'' --'");
    // The result must remain a single SQL string literal (odd apostrophes only
    // from the wrapping pair).
    expect(sqlLit(payload).startsWith("'")).toBe(true);
    expect(sqlLit(payload).endsWith("'")).toBe(true);
  });

  it('escapes backslashes (defense against MySQL-style escapes)', () => {
    expect(sqlLit('C:\\path')).toBe("'C:\\\\path'");
  });

  it('escapes both quotes and backslashes together', () => {
    expect(sqlLit("'; DROP TABLE page; --\\")).toMatch(/^'([^']|'')*'$/);
    // Ensure no unescaped single quote survives.
    const body = sqlLit("x'\\'y").slice(1, -1);
    expect(body).not.toMatch(/(^|[^'])'(?!')/);
  });

  it('handles the empty string', () => {
    expect(sqlLit('')).toBe("''");
  });

  it('neutralizes a stacked query via semicolon (remains inside quotes)', () => {
    const out = sqlLit("x'); DROP TABLE page;--");
    expect(out.includes('DROP TABLE')).toBe(true); // still present, but ...
    const body = out.slice(1, -1);
    // ... every single quote is doubled, so it is inert data. Lone quotes
    // (unpaired) would break out of the literal — there must be none.
    expect(body).toMatch(/^([^']|'')*$/); // only doubled '' runs allowed
    expect(body).not.toMatch(/(^|[^'])'(?!')/); // no lone ' anywhere
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// sqlInt — numeric rendering (rejects non-numeric smuggling)
// ═══════════════════════════════════════════════════════════════════════════════

describe('sqlInt', () => {
  it('renders a finite integer', () => {
    expect(sqlInt(42)).toBe('42');
  });

  it('truncates fractional input to an integer', () => {
    expect(sqlInt(42.9)).toBe('42');
  });

  it('renders zero', () => {
    expect(sqlInt(0)).toBe('0');
  });

  it('throws on NaN', () => {
    expect(() => sqlInt(Number.NaN)).toThrow(/finite number/);
  });

  it('throws on Infinity / -Infinity', () => {
    expect(() => sqlInt(Number.POSITIVE_INFINITY)).toThrow(/finite number/);
    expect(() => sqlInt(Number.NEGATIVE_INFINITY)).toThrow(/finite number/);
  });
});
