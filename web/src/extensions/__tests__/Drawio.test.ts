/**
 * Tests for Drawio extension helper functions.
 *
 * Covers: escapeHtml, decodeDrawioXml, encodeDrawioData, extractSvgFromDrawioExport.
 * These are pure utility functions — no DOM/Tiptap dependencies.
 */
import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  decodeDrawioXml,
  encodeDrawioData,
  extractSvgFromDrawioExport,
} from '../Drawio';

describe('Drawio helpers', () => {
  describe('escapeHtml', () => {
    it('escapes & < > " characters', () => {
      expect(escapeHtml('& " < >')).toBe('&amp; &quot; &lt; &gt;');
    });

    it('returns empty string for empty input', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('passes through safe strings unchanged', () => {
      expect(escapeHtml('hello world')).toBe('hello world');
    });
  });

  describe('decodeDrawioXml', () => {
    it('returns plain XML as-is', () => {
      const xml = '<?xml version="1.0"?><root><item/></root>';
      expect(decodeDrawioXml(xml)).toBe(xml);
    });

    it('returns mx-prefixed data as-is', () => {
      const data = '<mxfile><diagram/></mxfile>';
      expect(decodeDrawioXml(data)).toBe(data);
    });

    it('decodes base64-encoded XML', () => {
      const xml = '<mxfile><diagram/></mxfile>';
      const encoded = btoa(xml);
      expect(decodeDrawioXml(encoded)).toBe(xml);
    });

    it('returns data as-is if not XML and not valid base64', () => {
      const data = 'some-random-data';
      expect(decodeDrawioXml(data)).toBe(data);
    });
  });

  describe('encodeDrawioData', () => {
    it('encodes XML to base64', () => {
      const xml = '<mxfile><diagram/></mxfile>';
      const encoded = encodeDrawioData(xml);
      expect(encoded).toBe(btoa(unescape(encodeURIComponent(xml))));
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('handles special characters in XML', () => {
      const xml = '<node value="año 2024"/>';
      const encoded = encodeDrawioData(xml);
      // Should be valid base64 that decodes to the original
      const decoded = decodeURIComponent(escape(atob(encoded)));
      expect(decoded).toBe(xml);
    });
  });

  describe('extractSvgFromDrawioExport', () => {
    it('extracts svg from JSON export with svg field', () => {
      const svg = '<svg><rect/></svg>';
      const data = JSON.stringify({ svg, xml: '<mxfile/>' });
      expect(extractSvgFromDrawioExport(data)).toBe(svg);
    });

    it('extracts inline svg from xml in JSON export', () => {
      const svg = '<svg width="100"><circle/></svg>';
      const xml = `<mxfile>${svg}</mxfile>`;
      const data = JSON.stringify({ xml });
      expect(extractSvgFromDrawioExport(data)).toBe(svg);
    });

    it('extracts svg from raw XML string', () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
      expect(extractSvgFromDrawioExport(svg)).toBe(svg);
    });

    it('returns null for data with no SVG', () => {
      expect(extractSvgFromDrawioExport('no svg here')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(extractSvgFromDrawioExport('')).toBeNull();
    });

    it('handles JSON without svg or xml fields', () => {
      const data = JSON.stringify({ event: 'save' });
      expect(extractSvgFromDrawioExport(data)).toBeNull();
    });
  });
});
