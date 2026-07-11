import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock fetch used by callReducerLocal ──────────────────────────────────────
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

import {
  arrayBufferToBase64Url,
  htmlToProseMirror,
  markdownToProseMirror,
  tiptapToMarkdown,
  tiptapToHTML,
  callReducerLocal,
} from '../lib/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// arrayBufferToBase64Url
// ═══════════════════════════════════════════════════════════════════════════════

describe('arrayBufferToBase64Url', () => {
  it('converts an ArrayBuffer to base64url', () => {
    const buf = new Uint8Array([104, 101, 108, 108, 111]).buffer; // "hello"
    expect(arrayBufferToBase64Url(buf)).toBe('aGVsbG8');
  });

  it('produces no padding (=) characters', () => {
    const buf = new Uint8Array([104]).buffer;
    const result = arrayBufferToBase64Url(buf);
    expect(result).not.toContain('=');
  });

  it('replaces + and / with - and _', () => {
    // Base64 of 0xfb, 0xff, 0xff, 0xff is "++//"
    const buf = new Uint8Array([0xfb, 0xff, 0xff, 0xff]).buffer;
    const result = arrayBufferToBase64Url(buf);
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
  });

  it('handles empty ArrayBuffer', () => {
    const buf = new Uint8Array([]).buffer;
    expect(arrayBufferToBase64Url(buf)).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// htmlToProseMirror
// ═══════════════════════════════════════════════════════════════════════════════

describe('htmlToProseMirror', () => {
  it('converts a simple paragraph', () => {
    const result = htmlToProseMirror('<p>Hello world</p>');
    expect(result).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    });
  });

  it('converts headings h1-h6', () => {
    const result = htmlToProseMirror('<h1>A</h1><h2>B</h2><h6>C</h6>');
    expect(result.content[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    expect(result.content[1]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
    expect(result.content[2]).toMatchObject({ type: 'heading', attrs: { level: 6 } });
  });

  it('converts unordered list', () => {
    const result = htmlToProseMirror('<ul><li>One</li><li>Two</li></ul>');
    expect(result.content[0]).toMatchObject({
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }],
        },
      ],
    });
  });

  it('converts ordered list', () => {
    const result = htmlToProseMirror('<ol><li>First</li></ol>');
    expect(result.content[0].type).toBe('orderedList');
  });

  it('converts blockquote', () => {
    const result = htmlToProseMirror('<blockquote>Quote</blockquote>');
    expect(result.content[0]).toMatchObject({
      type: 'blockquote',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote' }] }],
    });
  });

  it('converts code block', () => {
    const result = htmlToProseMirror('<pre><code>const x = 1;</code></pre>');
    expect(result.content[0]).toMatchObject({
      type: 'codeBlock',
      content: [{ type: 'text', text: 'const x = 1;' }],
    });
  });

  it('converts horizontal rule', () => {
    const result = htmlToProseMirror('<hr />');
    expect(result.content[0].type).toBe('horizontalRule');
  });

  it('converts image inside figure', () => {
    const result = htmlToProseMirror(
      '<figure><img src="https://example.com/img.png" alt="pic" /></figure>',
    );
    expect(result.content[0]).toMatchObject({
      type: 'image',
      attrs: { src: 'https://example.com/img.png', alt: 'pic' },
    });
  });

  it('converts a table', () => {
    const result = htmlToProseMirror('<table><tr><th>H</th><td>C</td></tr></table>');
    expect(result.content[0].type).toBe('table');
    expect(result.content[0].content[0].type).toBe('tableRow');
  });

  it('converts various inline formatting (bold, italic, code, strike, link)', () => {
    const html =
      '<p><strong>Bold</strong> <em>Italic</em> <code>Code</code> <s>Strike</s> <a href="https://x.com">Link</a></p>';
    const result = htmlToProseMirror(html);
    const para = result.content[0];
    const texts = para.content.map((c: any) => c.text);
    const marks = para.content.map((c: any) => c.marks?.[0]?.type);
    expect(texts).toEqual(expect.arrayContaining(['Bold', 'Italic', 'Code', 'Strike', 'Link']));
    expect(marks).toContain('bold');
    expect(marks).toContain('italic');
    expect(marks).toContain('code');
    expect(marks).toContain('strike');
    expect(marks).toContain('link');
  });

  it('continues with inline formatting in correct element order', () => {
    const html = '<p><strong>A</strong> <em>B</em></p>';
    const result = htmlToProseMirror(html);
    const para = result.content[0];
    // Space text nodes get trimmed; B should be the marked italic element
    expect(para.content[0]).toMatchObject({ type: 'text', text: 'A', marks: [{ type: 'bold' }] });
    const italicTexts = para.content.filter((c: any) => c.marks?.[0]?.type === 'italic');
    expect(italicTexts).toHaveLength(1);
    expect(italicTexts[0]).toMatchObject({ text: 'B' });
  });

  it('converts text node directly (non-element child)', () => {
    const result = htmlToProseMirror('plain text');
    expect(result.content[0]).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: 'plain text' }],
    });
  });

  it('returns empty paragraph for empty HTML', () => {
    const result = htmlToProseMirror('');
    expect(result).toEqual({ type: 'doc', content: [{ type: 'paragraph', content: [] }] });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// markdownToProseMirror
// ═══════════════════════════════════════════════════════════════════════════════

describe('markdownToProseMirror', () => {
  it('converts a simple paragraph', () => {
    const result = markdownToProseMirror('Hello world');
    expect(result).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    });
  });

  it('converts headings', () => {
    const result = markdownToProseMirror('# H1\n## H2\n###### H6');
    expect(result.content[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    expect(result.content[1]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
    expect(result.content[2]).toMatchObject({ type: 'heading', attrs: { level: 6 } });
  });

  it('converts unordered list', () => {
    const result = markdownToProseMirror('- One\n- Two');
    expect(result.content[0]).toMatchObject({ type: 'bulletList' });
    expect(result.content[0].content).toHaveLength(2);
  });

  it('converts ordered list', () => {
    const result = markdownToProseMirror('1. First\n2. Second');
    expect(result.content[0].type).toBe('orderedList');
  });

  it('converts inline formatting: **bold**, _italic_, `code`, ~~strike~~, [link](url)', () => {
    const result = markdownToProseMirror('**B** _I_ `C` ~~S~~ [L](https://x.com)');
    const para = result.content[0];
    // The addParagraph function inserts spaces as separate text nodes
    const marks = para.content.filter((c: any) => c.marks).map((c: any) => c.marks[0].type);
    expect(marks).toContain('bold');
    expect(marks).toContain('italic');
    expect(marks).toContain('code');
    expect(marks).toContain('strike');
    expect(marks).toContain('link');
    expect(para.content[0]).toMatchObject({ type: 'text', text: 'B', marks: [{ type: 'bold' }] });
  });

  it('converts code block with language', () => {
    const result = markdownToProseMirror('```ts\nconst x = 1;\n```');
    expect(result.content[0]).toMatchObject({
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const x = 1;' }],
    });
  });

  it('converts blockquote', () => {
    const result = markdownToProseMirror('> Quote text');
    expect(result.content[0].type).toBe('blockquote');
  });

  it('converts horizontal rule', () => {
    const result = markdownToProseMirror('---');
    expect(result.content[0].type).toBe('horizontalRule');
  });

  it('handles empty markdown', () => {
    const result = markdownToProseMirror('');
    expect(result).toEqual({ type: 'doc', content: [{ type: 'paragraph', content: [] }] });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// tiptapToMarkdown
// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: helpers.ts now has the complete implementation (consolidated from tiptap-helpers.ts).

describe('tiptapToMarkdown', () => {
  it('converts a paragraph', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    };
    expect(tiptapToMarkdown(doc)).toBe('Hello');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// tiptapToHTML
// ═══════════════════════════════════════════════════════════════════════════════
// NOTE: helpers.ts version is now the canonical implementation.

describe('tiptapToHTML', () => {
  it('converts a paragraph', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    };
    expect(tiptapToHTML(doc)).toBe('<p>Hello</p>');
  });

  it('converts heading with level', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Section' }] },
      ],
    };
    expect(tiptapToHTML(doc)).toBe('<h3>Section</h3>');
  });

  it('converts bullet list (wraps items in <p>)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item' }] }],
            },
          ],
        },
      ],
    };
    const html = tiptapToHTML(doc);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li><p>Item</p></li>');
    expect(html).toContain('</ul>');
  });

  it('converts code block', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: 'const x = 1;' }],
        },
      ],
    };
    expect(tiptapToHTML(doc)).toContain('<pre><code>const x = 1;</code></pre>');
  });

  it('converts blockquote (wraps content in <p>)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote' }] }],
        },
      ],
    };
    expect(tiptapToHTML(doc)).toBe('<blockquote><p>Quote</p></blockquote>');
  });

  it('converts horizontal rule', () => {
    const doc = { type: 'doc', content: [{ type: 'horizontalRule' }] };
    expect(tiptapToHTML(doc)).toContain('<hr />');
  });

  it('converts image', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'img.png', alt: 'pic' } }],
    };
    expect(tiptapToHTML(doc)).toContain('<img src="img.png" alt="pic"');
  });

  it('callout blocks fall through to generic content (not rendered as callout)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { type: 'tip' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tip text' }] }],
        },
      ],
    };
    const html = tiptapToHTML(doc);
    // helpers.ts version doesn't handle callout — falls through to
    // generic content handler which outputs paragraph text
    expect(html).toBe('<p>Tip text</p>');
  });

  it('returns empty string for null/empty doc', () => {
    expect(tiptapToHTML(null)).toBe('');
    expect(tiptapToHTML({})).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// callReducerLocal
// ═══════════════════════════════════════════════════════════════════════════════

describe('callReducerLocal', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true } as Response);
  });

  it('calls fetch with correct STDB endpoint', async () => {
    await callReducerLocal('test_reducer', [{ arg1: 'value' }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('/v1/database/');
    expect(url).toContain('/call/test_reducer');
    expect(mockFetch.mock.calls[0][1]?.method).toBe('POST');
  });

  it('sends JSON body with args', async () => {
    await callReducerLocal('add_page', [{ title: 'Test' }]);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual([{ title: 'Test' }]);
  });
});
