/**
 * Tests for the VideoEmbed Tiptap extension.
 *
 * Covers: schema registration, provider detection, commands, parse/render HTML,
 * auto-detection of providers from URLs.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VideoEmbed, detectProvider, buildEmbedUrl } from '../VideoEmbed';
import { createEditor, getHTML } from './test-utils';

describe('VideoEmbed extension', () => {
  let editor: ReturnType<typeof createEditor>;

  beforeEach(() => {
    editor = createEditor([VideoEmbed]);
  });

  afterEach(() => {
    editor.destroy();
  });

  it('registers the videoEmbed node', () => {
    expect(editor.schema.nodes.videoEmbed).toBeDefined();
  });

  describe('detectProvider', () => {
    it('detects YouTube', () => {
      expect(detectProvider('https://youtube.com/watch?v=abc123def45')?.id).toBe('youtube');
    });

    it('detects Vimeo', () => {
      expect(detectProvider('https://vimeo.com/123456789')?.id).toBe('vimeo');
    });

    it('detects Loom', () => {
      expect(detectProvider('https://loom.com/share/abc123def456')?.id).toBe('loom');
    });

    it('returns null for unknown URLs', () => {
      expect(detectProvider('https://example.com/video.mp4')).toBeNull();
    });
  });

  describe('buildEmbedUrl', () => {
    it('builds YouTube embed URL', () => {
      const result = buildEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result?.provider.id).toBe('youtube');
      expect(result?.embedSrc).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('builds Vimeo embed URL', () => {
      const result = buildEmbedUrl('https://vimeo.com/987654321');
      expect(result?.provider.id).toBe('vimeo');
      expect(result?.embedSrc).toBe('https://player.vimeo.com/video/987654321');
    });
  });

  it('inserts a video embed via command and verifies rendered HTML', () => {
    editor.commands.setVideoEmbed({ src: 'https://youtu.be/dQw4w9WgXcQ' });
    const html = editor.getHTML();
    expect(html).toContain('data-video-embed');
    expect(html).toContain('data-provider="youtube"');
    expect(html).toContain('youtube.com/embed');
  });

  it('renders iframe in output HTML', () => {
    editor.commands.setVideoEmbed({ src: 'https://youtu.be/dQw4w9WgXcQ' });
    const html = getHTML(editor);
    expect(html).toContain('<iframe');
    expect(html).toContain('youtube.com/embed');
  });
});
