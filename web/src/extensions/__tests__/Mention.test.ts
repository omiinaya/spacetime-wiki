/**
 * Tests for the Mention Tiptap extension.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Mention } from '../Mention';
import { createEditor, getHTML } from './test-utils';

describe('Mention extension', () => {
  let editor: ReturnType<typeof createEditor>;

  beforeEach(() => {
    editor = createEditor([Mention]);
  });

  afterEach(() => {
    editor.destroy();
  });

  it('registers the mention node', () => {
    expect(editor.schema.nodes.mention).toBeDefined();
  });

  it('is inline and atomic', () => {
    const node = editor.schema.nodes.mention;
    expect(node.spec.inline).toBe(true);
    expect(node.spec.group).toBe('inline');
    expect(node.spec.atom).toBe(true);
  });

  it('inserts mention via command and renders data-mention attribute', () => {
    // Tiptap's setContent doesn't parse <span data-mention> into a mention node
    // because the schema parser treats it as unknown HTML. Use the command instead.
    editor.commands.insertMention({ id: 'user-1', label: 'Alice' });
    const html = editor.getHTML();
    expect(html).toContain('data-mention="user-1"');
    expect(html).toContain('class="mention"');
  });

  it('insertMention command inserts a mention node', () => {
    editor.commands.insertMention({ id: 'u42', label: 'Bob' });
    const json = editor.getJSON();
    const mention = (json.content![0].content as any)?.find((n: any) => n.type === 'mention');
    expect(mention).toBeDefined();
    expect(mention.attrs.id).toBe('u42');
    expect(mention.attrs.label).toBe('Bob');
  });

  it('renders mention with data-mention attribute', () => {
    editor.commands.insertMention({ id: 'u7', label: 'Charlie' });
    const html = getHTML(editor);
    expect(html).toContain('data-mention="u7"');
    expect(html).toContain('class="mention"');
    expect(html).toContain('@Charlie');
  });

  it('renders correct text representation', () => {
    // Insert a mention and check plain text output
    editor.commands.insertMention({ id: 'u1', label: 'Alice' });
    const text = editor.getText();
    expect(text).toContain('@Alice');
  });
});
