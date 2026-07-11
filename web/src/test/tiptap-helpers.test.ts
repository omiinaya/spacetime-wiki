import { describe, it, expect } from 'vitest';

import {
  tiptapToMarkdown,
  tiptapToHTML,
  htmlToProseMirror,
  markdownToProseMirror,
  arrayBufferToBase64Url,
} from '../lib/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// tiptapToMarkdown (complete implementation — unlike helpers.ts stub)
// ═══════════════════════════════════════════════════════════════════════════════

describe('tiptapToMarkdown', () => {
  it('converts a paragraph', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    };
    expect(tiptapToMarkdown(doc)).toBe('Hello');
  });

  it('converts heading with level', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Subtitle' }] },
      ],
    };
    expect(tiptapToMarkdown(doc)).toBe('## Subtitle');
  });

  it('converts bullet list items', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
            },
          ],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('- A');
    expect(md).toContain('- B');
  });

  it('converts ordered list items as hyphens (no ordered numbering)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }],
            },
          ],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('- First');
  });

  it('converts code block with language', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'ts' },
          content: [{ type: 'text', text: 'const x = 1;' }],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('```ts');
    expect(md).toContain('const x = 1;');
    expect(md).toContain('```');
  });

  it('converts code block without language', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: 'plain code' }],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('```');
    expect(md).toContain('plain code');
  });

  it('converts blockquote with prefixed lines', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cite' }] }],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('> Cite');
  });

  it('converts horizontal rule', () => {
    const doc = { type: 'doc', content: [{ type: 'horizontalRule' }] };
    expect(tiptapToMarkdown(doc)).toContain('---');
  });

  it('converts callout block with type', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { type: 'warning' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Watch out' }] }],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('[!WARNING]');
    expect(md).toContain('Watch out');
  });

  it('converts callout with default type', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Note' }] }],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('[!INFO]');
  });

  it('converts task list with checked and unchecked items', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Todo' }] }],
            },
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done' }] }],
            },
          ],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('- [ ] Todo');
    expect(md).toContain('- [x] Done');
  });

  it('converts a table with header and data rows', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Col1' }] }],
                },
                {
                  type: 'tableHeader',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Col2' }] }],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
                },
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
                },
              ],
            },
          ],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    // "---".repeat(2) = "------" (no separator logic)
    expect(md).toContain('| Col1 | Col2 |');
    expect(md).toContain('| ------ |');
    expect(md).toContain('| A | B |');
  });

  it('converts inline marks: bold, italic, code, strike, link', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'B', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' I ', marks: [{ type: 'italic' }] },
            { type: 'text', text: 'C', marks: [{ type: 'code' }] },
            { type: 'text', text: ' S ', marks: [{ type: 'strike' }] },
            {
              type: 'text',
              text: 'L',
              marks: [{ type: 'link', attrs: { href: 'https://x.com' } }],
            },
          ],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    // Spaces in text content get rendered inside the mark delimiters
    expect(md).toContain('**B**');
    expect(md).toMatch(/_ I _/);
    expect(md).toContain('`C`');
    expect(md).toMatch(/~~ S ~~/);
    expect(md).toContain('[L](https://x.com)');
  });

  it('converts image node', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'image', attrs: { src: 'img.png', alt: 'pic' } }],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('![pic](img.png)');
  });

  it('handles hard break by adding a newline', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Line 1' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Line 2' },
          ],
        },
      ],
    };
    const md = tiptapToMarkdown(doc);
    expect(md).toContain('Line 1');
    expect(md).toContain('Line 2');
  });

  it('returns trimmed string (no trailing whitespace)', () => {
    const doc = { type: 'doc', content: [] };
    const md = tiptapToMarkdown(doc);
    expect(md).toBe('');
    expect(md).toBe(md.trim());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// tiptapToHTML (helpers.ts version — no trailing newlines, no callout)
// ═══════════════════════════════════════════════════════════════════════════════

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

  it('converts bullet list', () => {
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
    expect(html).toContain('<ul><li><p>Item</p></li></ul>');
  });

  it('converts ordered list', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }],
            },
          ],
        },
      ],
    };
    const html = tiptapToHTML(doc);
    expect(html).toContain('<ol><li><p>First</p></li></ol>');
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

  it('converts blockquote', () => {
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
    expect(tiptapToHTML(doc)).toBe('<hr />');
  });

  it('converts image with src and alt', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'img.png', alt: 'pic' } }],
    };
    expect(tiptapToHTML(doc)).toBe('<img src="img.png" alt="pic" />');
  });

  it('converts callout block — no special styling in helpers.ts version', () => {
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
    // helpers.ts tiptapToHTML doesn't render callout blocks specially — falls through to content
    expect(html).toContain('<p>Tip text</p>');
  });

  it('converts warning callout — no special styling in helpers.ts version', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { type: 'warning' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Warning!' }] }],
        },
      ],
    };
    const html = tiptapToHTML(doc);
    expect(html).toContain('<p>Warning!</p>');
  });

  it('converts danger callout — no special styling in helpers.ts version', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { type: 'danger' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Danger!' }] }],
        },
      ],
    };
    const html = tiptapToHTML(doc);
    expect(html).toContain('<p>Danger!</p>');
  });

  it('returns empty string for null/empty doc', () => {
    expect(tiptapToHTML(null)).toBe('');
    expect(tiptapToHTML({})).toBe('');
    expect(tiptapToHTML({ type: 'doc' })).toBe('');
  });

  it('renders multiple block types in sequence', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Body' }] },
        { type: 'horizontalRule' },
      ],
    };
    const html = tiptapToHTML(doc);
    // helpers.ts version: no trailing newlines on blocks, doc joins with \n
    expect(html).toContain('<h1>Title</h1>\n<p>Body</p>\n<hr />');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// htmlToProseMirror — identical to helpers.ts version
// ═══════════════════════════════════════════════════════════════════════════════

describe('htmlToProseMirror', () => {
  it('converts paragraph', () => {
    const result = htmlToProseMirror('<p>Hello</p>');
    expect(result).toMatchObject({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    });
  });

  it('converts h1-h6', () => {
    const result = htmlToProseMirror('<h1>A</h1><h2>B</h2><h6>C</h6>');
    expect(result.content[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    expect(result.content[1]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
    expect(result.content[2]).toMatchObject({ type: 'heading', attrs: { level: 6 } });
  });

  it('converts list, blockquote, code, hr, image, table', () => {
    const html =
      '<ul><li>A</li></ul><blockquote>Q</blockquote><pre><code>x</code></pre><hr /><figure><img src="x.png" /></figure><table><tr><td>C</td></tr></table>';
    const result = htmlToProseMirror(html);
    expect(result.content[0].type).toBe('bulletList');
    expect(result.content[1].type).toBe('blockquote');
    expect(result.content[2].type).toBe('codeBlock');
    expect(result.content[3].type).toBe('horizontalRule');
    expect(result.content[4].type).toBe('image');
    expect(result.content[5].type).toBe('table');
  });

  it('returns empty paragraph for empty HTML', () => {
    const result = htmlToProseMirror('');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('paragraph');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// markdownToProseMirror — identical to helpers.ts version
// ═══════════════════════════════════════════════════════════════════════════════

describe('markdownToProseMirror', () => {
  it('converts paragraph', () => {
    const result = markdownToProseMirror('Hello world');
    expect(result.content[0].type).toBe('paragraph');
  });

  it('converts headings, lists, code, blockquote, hr', () => {
    const result = markdownToProseMirror('# H1\n## H2\n- Item\n> Q\n```\ncode\n```\n---');
    const types = result.content.map((n: any) => n.type);
    expect(types).toContain('heading');
    expect(types).toContain('bulletList');
    expect(types).toContain('blockquote');
    expect(types).toContain('codeBlock');
    expect(types).toContain('horizontalRule');
  });

  it('converts inline formatting', () => {
    const result = markdownToProseMirror('**B** _I_ `C`');
    const marks = result.content[0].content
      .filter((c: any) => c.marks)
      .map((c: any) => c.marks[0].type);
    expect(marks).toContain('bold');
    expect(marks).toContain('italic');
    expect(marks).toContain('code');
  });

  it('handles empty markdown', () => {
    const result = markdownToProseMirror('');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('paragraph');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// arrayBufferToBase64Url — identical to helpers.ts version
// ═══════════════════════════════════════════════════════════════════════════════

describe('arrayBufferToBase64Url', () => {
  it('converts ArrayBuffer to base64url', () => {
    const buf = new Uint8Array([104, 101, 108, 108, 111]).buffer;
    expect(arrayBufferToBase64Url(buf)).toBe('aGVsbG8');
  });

  it('removes padding and replaces +/', () => {
    const buf = new Uint8Array([0xfb, 0xff, 0xff, 0xff]).buffer;
    const result = arrayBufferToBase64Url(buf);
    expect(result).not.toContain('=');
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
  });

  it('handles empty buffer', () => {
    expect(arrayBufferToBase64Url(new ArrayBuffer(0))).toBe('');
  });
});
