import { describe, it, expect } from 'vitest';

// ─── Drawio extension helpers ────────────────────────────────────────────────

import {
  escapeHtml as drawioEscapeHtml,
  decodeDrawioXml,
  encodeDrawioData,
  extractSvgFromDrawioExport,
} from '../extensions/Drawio';

describe('Drawio — escapeHtml', () => {
  it('escapes & < > "', () => {
    expect(drawioEscapeHtml(`& < > "`)).toBe('&amp; &lt; &gt; &quot;');
  });

  it('returns empty string for empty input', () => {
    expect(drawioEscapeHtml('')).toBe('');
  });

  it('passes through normal text', () => {
    expect(drawioEscapeHtml('Hello, World!')).toBe('Hello, World!');
  });

  it('escapes all special chars in mixed text', () => {
    expect(drawioEscapeHtml(`<script>alert("xss")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });
});

describe('Drawio — decodeDrawioXml', () => {
  it('returns plain XML as-is', () => {
    const xml = '<?xml version="1.0"?><root></root>';
    expect(decodeDrawioXml(xml)).toBe(xml);
  });

  it('decodes base64-encoded XML', () => {
    const xml = '<?xml version="1.0"?><root>hello</root>';
    const encoded = btoa(unescape(encodeURIComponent(xml)));
    expect(decodeDrawioXml(encoded)).toBe(xml);
  });

  it('returns raw data for non-XML, non-base64 input', () => {
    expect(decodeDrawioXml('just random text')).toBe('just random text');
  });

  it('handles <mx prefix as plain XML', () => {
    const mxData = '<mxGraphModel><root></root></mxGraphModel>';
    expect(decodeDrawioXml(mxData)).toBe(mxData);
  });
});

describe('Drawio — encodeDrawioData', () => {
  it('encodes XML to base64', () => {
    const xml = '<?xml version="1.0"?><root></root>';
    const expected = btoa(unescape(encodeURIComponent(xml)));
    expect(encodeDrawioData(xml)).toBe(expected);
  });

  it('round-trips with decodeDrawioXml', () => {
    const xml = "<mxGraphModel><root><mxCell id='0'/></root></mxGraphModel>";
    const encoded = encodeDrawioData(xml);
    expect(decodeDrawioXml(encoded)).toBe(xml);
  });
});

describe('Drawio — extractSvgFromDrawioExport', () => {
  it('extracts SVG from JSON with svg field', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5"/></svg>';
    const data = JSON.stringify({ svg, xml: '<mxfile></mxfile>' });
    expect(extractSvgFromDrawioExport(data)).toBe(svg);
  });

  it('extracts SVG from JSON with xml field containing SVG', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="10" height="10"/></svg>';
    const data = JSON.stringify({ xml: `<root>${svg}</root>` });
    expect(extractSvgFromDrawioExport(data)).toBe(svg);
  });

  it('extracts SVG from raw string containing SVG tag', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Hello</text></svg>';
    expect(extractSvgFromDrawioExport(svg)).toBe(svg);
  });

  it('returns null for input with no SVG', () => {
    expect(extractSvgFromDrawioExport('plain text')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractSvgFromDrawioExport('')).toBeNull();
  });
});

// ─── PlantUML extension helpers ──────────────────────────────────────────────

import { escapeHtml as plantumlEscapeHtml, getDiagramUrl } from '../extensions/PlantUML';

describe('PlantUML — escapeHtml', () => {
  it('escapes & < > "', () => {
    expect(plantumlEscapeHtml(`& < > "`)).toBe('&amp; &lt; &gt; &quot;');
  });

  it('handles empty input', () => {
    expect(plantumlEscapeHtml('')).toBe('');
  });
});

describe('PlantUML — getDiagramUrl', () => {
  it('returns an SVG URL for valid PlantUML source', () => {
    const url = getDiagramUrl('@startuml\nA -> B\n@enduml');
    expect(url).toMatch(/^https:\/\/www\.plantuml\.com\/plantuml\/svg\//);
    expect(url.length).toBeGreaterThan(50);
  });

  it('uses custom server URL when provided', () => {
    const customServer = 'https://custom-plantuml.example.com';
    const url = getDiagramUrl('@startuml\nA -> B\n@enduml', customServer);
    expect(url).toMatch(new RegExp(`^${customServer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/svg/`));
  });

  it('produces deterministic output for same input', () => {
    const src = '@startuml\nX -> Y\n@enduml';
    expect(getDiagramUrl(src)).toBe(getDiagramUrl(src));
  });
});
