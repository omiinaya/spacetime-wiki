/**
 * Test utilities for Tiptap extension tests.
 *
 * Creates minimal editor instances to verify extension registration,
 * schema, commands, input rules, and HTML serialization/parsing.
 *
 * NOTE: All editors include the base schema extensions (Document, Paragraph,
 * Text) because ProseMirror requires a top-level `doc` node type plus at
 * least one block node and one inline node to build a valid schema.
 */
import { Editor } from '@tiptap/core';
import type { Extensions } from '@tiptap/core';
import { expect } from 'vitest';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';

/** Base extensions required for any valid Tiptap editor schema */
const BASE_EXTENSIONS: Extensions = [Document, Paragraph, Text];

/**
 * Create a minimal Tiptap editor with the given extensions plus base schema.
 */
export function createEditor(extensions: Extensions) {
  return new Editor({
    extensions: [...BASE_EXTENSIONS, ...extensions],
    content: '',
  });
}

/**
 * Create an editor pre-populated with HTML content.
 */
export function createEditorWithContent(extensions: Extensions, html: string) {
  return new Editor({
    extensions: [...BASE_EXTENSIONS, ...extensions],
    content: html,
  });
}

/**
 * Serialize editor state back to HTML and remove any zero-width whitespace
 * or empty paragraph artifacts that Tiptap/ProseMirror inserts.
 */
export function getHTML(editor: Editor): string {
  return editor.getHTML();
}

/**
 * Assert that the editor's current content matches expected HTML,
 * normalising whitespace for comparison.
 */
export function expectHTML(editor: Editor, expected: string) {
  const actual = getHTML(editor);
  // Strip zero-width space and collapse whitespace for comparison
  const normalizedActual = actual.replace(/\u200B/g, '').replace(/>\s+</g, '><');
  const normalizedExpected = expected.replace(/\u200B/g, '').replace(/>\s+</g, '><');
  expect(normalizedActual).toBe(normalizedExpected);
}

/**
 * Extract a JSON structure representing the doc from the editor.
 */
export function getJSON(editor: Editor) {
  return editor.getJSON();
}
