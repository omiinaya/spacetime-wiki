import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTransclusions } from '../lib/api/transclusions';
import type { Page } from '../lib/api';

const mockGetPage = vi.fn();
vi.mock('../lib/api/pages', () => ({
  getPage: (...a: unknown[]) => mockGetPage(...a),
}));

function page(id: string, title: string, content: string): Page {
  return {
    id,
    title,
    slug: id,
    content,
    text_content: '',
    collection_id: '',
    parent_page_id: '',
    status: 'published',
    icon: '',
    color: '',
    full_width: false,
    is_pinned: false,
    is_template: false,
    template_id: '',
    sort_order: 0,
    created_by: 'u1',
    updated_by: 'u1',
    created_at: 1700000,
    updated_at: 1700000,
    published_at: 1700000,
    deleted_at: null,
    direction: 'ltr',
  };
}

describe('resolveTransclusions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns non-object input unchanged', async () => {
    expect(await resolveTransclusions(null)).toBeNull();
    expect(await resolveTransclusions('str')).toBe('str');
  });

  it('leaves documents without transclusion patterns untouched', async () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    };
    const out = await resolveTransclusions(doc);
    expect(out).toEqual(doc);
    expect(mockGetPage).not.toHaveBeenCalled();
  });

  it('replaces a {{@id}} transclusion with a transclusion node', async () => {
    mockGetPage.mockResolvedValue(page('p1', 'Alpha', '{"type":"doc","content":[]}'));
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'See {{@p1}} for details' }] },
      ],
    };
    const out = (await resolveTransclusions(doc)) as {
      content: { content: { content: { type: string; attrs?: Record<string, unknown> }[] } }[];
    };
    const nodes = out.content[0].content[0].content;
    expect(mockGetPage).toHaveBeenCalledWith('p1');
    expect(nodes[0]).toEqual({ type: 'text', text: 'See ' });
    expect(nodes[1].type).toBe('transclusion');
    expect(nodes[1].attrs?.pageId).toBe('p1');
    expect(nodes[1].attrs?.pageTitle).toBe('Alpha');
    expect(nodes[2]).toEqual({ type: 'text', text: ' for details' });
  });

  it('shows a placeholder when the referenced page is not found', async () => {
    mockGetPage.mockResolvedValue(null);
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'See {{@missing}}' }] }],
    };
    const out = (await resolveTransclusions(doc)) as {
      content: { content: { content: { type: string; text?: string }[] } }[];
    };
    const nodes = out.content[0].content[0].content;
    // "See {{@missing}}" -> parts ["See ", placeholder], wrapped in a virtual paragraph
    expect(nodes[0]).toEqual({ type: 'text', text: 'See ' });
    expect(nodes[1]).toEqual({ type: 'text', text: '[Page not found: missing]' });
  });

  it('resolves multiple transclusions in one text node', async () => {
    mockGetPage.mockResolvedValue(page('p1', 'Alpha', '{"type":"doc"}'));
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '{{@p1}} and {{@p1}}!' }] }],
    };
    const out = (await resolveTransclusions(doc)) as {
      content: { content: { content: { type: string }[] } }[];
    };
    const nodes = out.content[0].content[0].content;
    const transclusions = nodes.filter((n) => n.type === 'transclusion');
    expect(transclusions.length).toBe(2);
  });

  it('falls back to a placeholder paragraph when referenced content is invalid JSON', async () => {
    mockGetPage.mockResolvedValue(page('p1', 'Broken', '{not json'));
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '{{@p1}}' }] }],
    };
    const out = (await resolveTransclusions(doc)) as {
      content: {
        content: { type: string; attrs?: { content: { content: { text: string }[] } } }[];
      }[];
    };
    // lone "{{@p1}}" -> single part returned directly (not wrapped in a paragraph)
    const node = out.content[0].content[0];
    expect(node.type).toBe('transclusion');
    // fallback content is a full doc: paragraph > text
    const fallbackDoc = node.attrs?.content as {
      type: string;
      content: { type: string; content: { type: string; text: string }[] }[];
    };
    const fallbackText = fallbackDoc.content[0].content[0].text;
    expect(fallbackText).toContain('could not be parsed');
  });

  it('recurse through nested content', async () => {
    mockGetPage.mockResolvedValue(page('p1', 'Alpha', '{"type":"doc"}'));
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '{{@p1}}' }] }],
        },
      ],
    };
    const out = (await resolveTransclusions(doc)) as {
      content: { content: { content: { content: { type: string }[] } } }[];
    };
    expect(out.content[0].content[0].content[0].type).toBe('transclusion');
  });
});
