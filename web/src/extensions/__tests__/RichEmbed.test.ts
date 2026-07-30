/**
 * Tests for the RichEmbed Tiptap extension.
 *
 * Covers: schema registration, provider detection, commands, parse/render HTML.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RichEmbed, detectEmbedProvider, buildEmbedUrl, getAllProviders } from '../RichEmbed';
import { createEditor } from './test-utils';

describe('RichEmbed extension', () => {
  let editor: ReturnType<typeof createEditor>;

  beforeEach(() => {
    editor = createEditor([RichEmbed]);
  });

  afterEach(() => {
    editor.destroy();
  });

  it('registers the richEmbed node', () => {
    expect(editor.schema.nodes.richEmbed).toBeDefined();
  });

  it('is atomic and draggable', () => {
    const node = editor.schema.nodes.richEmbed;
    expect(node.spec.atom).toBe(true);
    expect(node.spec.draggable).toBe(true);
    expect(node.spec.selectable).toBe(true);
  });

  describe('detectEmbedProvider', () => {
    it('detects YouTube URLs', () => {
      expect(detectEmbedProvider('https://youtube.com/watch?v=dQw4w9WgXcQ')?.id).toBe('youtube');
      expect(detectEmbedProvider('https://youtu.be/dQw4w9WgXcQ')?.id).toBe('youtube');
    });

    it('detects Vimeo URLs', () => {
      expect(detectEmbedProvider('https://vimeo.com/123456789')?.id).toBe('vimeo');
    });

    it('detects Figma URLs', () => {
      expect(detectEmbedProvider('https://figma.com/file/abc123/MyDesign')?.id).toBe('figma');
    });

    it('detects GitHub URLs', () => {
      expect(detectEmbedProvider('https://github.com/user/repo')?.id).toBe('github');
    });

    it('returns null for unknown URLs', () => {
      expect(detectEmbedProvider('https://example.com')).toBeNull();
    });
  });

  describe('buildEmbedUrl', () => {
    it('builds YouTube embed URL', () => {
      const result = buildEmbedUrl('https://youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result?.provider.id).toBe('youtube');
      expect(result?.embedSrc).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('builds CodePen embed URL', () => {
      const result = buildEmbedUrl('https://codepen.io/user/pen/abc123');
      expect(result?.provider.id).toBe('codepen');
      expect(result?.embedSrc).toContain('codepen.io');
    });

    it('returns embedSrc null for richCard-only providers like GitHub', () => {
      const result = buildEmbedUrl('https://github.com/user/repo');
      expect(result?.provider.id).toBe('github');
      expect(result?.embedSrc).toBeNull();
    });
  });

  describe('getAllProviders', () => {
    it('returns at least 30 providers', () => {
      const providers = getAllProviders();
      expect(providers.length).toBeGreaterThanOrEqual(30);
    });

    it('has no duplicate IDs', () => {
      const providers = getAllProviders();
      const ids = providers.map((p) => p.id);
      expect(new Set(ids).size).toBe(providers.length);
    });

    it('each provider has required fields', () => {
      for (const p of getAllProviders()) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.icon).toBeTruthy();
        expect(p.urlPattern).toBeInstanceOf(RegExp);
        expect(typeof p.embedUrl).toBe('function');
      }
    });
  });

  it('inserts a rich embed node via command', () => {
    editor.commands.setRichEmbed({
      src: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      provider: 'youtube',
      embedSrc: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
    const json = editor.getJSON();
    const node = (json.content as any)?.find((n: any) => n.type === 'richEmbed');
    expect(node).toBeDefined();
    expect(node?.attrs?.provider).toBe('youtube');
  });

  it('renders rich embed card HTML for a provider with embedSrc', () => {
    editor.commands.setRichEmbed({
      src: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      provider: 'youtube',
      embedSrc: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
    const html = editor.getHTML();
    expect(html).toContain('data-rich-embed');
    expect(html).toContain('data-provider="youtube"');
  });

  it('renders rich embed for richCard-only provider (no embedSrc)', () => {
    editor.commands.setRichEmbed({
      src: 'https://github.com/user/repo',
      provider: 'github',
    });
    const html = editor.getHTML();
    expect(html).toContain('data-rich-embed');
    expect(html).toContain('data-provider="github"');
  });
});
