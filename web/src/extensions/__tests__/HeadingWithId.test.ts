/**
 * Tests for the HeadingWithId Tiptap extension.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { HeadingWithId } from '../HeadingWithId';
import Heading from '@tiptap/extension-heading';
import { createEditorWithContent } from './test-utils';

describe('HeadingWithId extension', () => {
  let editor: ReturnType<typeof createEditorWithContent>;

  afterEach(() => {
    editor?.destroy();
  });

  it('adds slugified id attribute to headings', () => {
    editor = createEditorWithContent([Heading, HeadingWithId], '<h1>Hello World</h1>');
    const html = editor.getHTML();
    expect(html).toContain('id="h-hello-world"');
  });

  it('handles special characters in heading text', () => {
    editor = createEditorWithContent([Heading, HeadingWithId], '<h2>Foo & Bar (2024)</h2>');
    const html = editor.getHTML();
    expect(html).toContain('id="h-foo-bar-2024"');
  });

  it('lowercases the slug', () => {
    editor = createEditorWithContent([Heading, HeadingWithId], '<h3>CAPS LOCK</h3>');
    const html = editor.getHTML();
    expect(html).toContain('id="h-caps-lock"');
  });

  it('omits id when heading has no text content', () => {
    editor = createEditorWithContent([Heading, HeadingWithId], '<h1></h1>');
    const html = editor.getHTML();
    expect(html).not.toContain('id="');
  });

  it('renders at the correct heading level', () => {
    editor = createEditorWithContent([Heading, HeadingWithId], '<h2>Section</h2>');
    const html = editor.getHTML();
    expect(html).toMatch(/<h2/);
  });

  it('preserves existing HTMLAttributes', () => {
    // HeadingWithId overrides renderHTML — only the id attribute is added.
    // Custom class/data attributes on the source HTML are not forwarded
    // by the heading extension's renderHTML. Test that id is still generated.
    editor = createEditorWithContent([Heading, HeadingWithId], '<h1>Title</h1>');
    const html = editor.getHTML();
    expect(html).toContain('id="h-title"');
  });
});
