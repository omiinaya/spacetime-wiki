/**
 * TypeScript type definitions for ProseMirror JSON (serialized) document structure.
 *
 * ProseMirror nodes serialize to JSON with a standard shape:
 *   { type, attrs?, content?, marks?, text? }
 *
 * These types describe the JSON (serialized) form, NOT the runtime Node/Mark classes.
 */

/** Base ProseMirror node in JSON-serializable form — minimal common shape */
export interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: PMMark[];
  text?: string;
}

/** A ProseMirror mark in JSON-serializable form */
export interface PMMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/** A ProseMirror text node */
export interface PMTextNode {
  type: 'text';
  text: string;
  marks?: PMMark[];
  attrs?: Record<string, unknown>;
  content?: undefined;
}

/** Link mark */
export interface PMLinkMark {
  type: 'link';
  attrs: { href: string; title?: string };
}

// ---- Specific node types (all use structured attrs) ----

export interface PMDoc {
  type: 'doc';
  content: PMNode[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMParagraph {
  type: 'paragraph';
  content?: PMNode[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMHeading {
  type: 'heading';
  attrs: { level: number };
  content: PMNode[];
  marks?: undefined;
  text?: undefined;
}

export interface PMBulletList {
  type: 'bulletList';
  content: PMNode[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMOrderedList {
  type: 'orderedList';
  content: PMNode[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMListItem {
  type: 'listItem';
  content: PMNode[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMTaskList {
  type: 'taskList';
  content: PMTaskItem[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMTaskItem {
  type: 'taskItem';
  attrs: { checked: boolean };
  content: PMNode[];
  marks?: undefined;
  text?: undefined;
}

export interface PMCodeBlock {
  type: 'codeBlock';
  attrs?: { language?: string };
  content: PMTextNode[];
  marks?: undefined;
  text?: undefined;
}

export interface PMBlockquote {
  type: 'blockquote';
  content: PMNode[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMHorizontalRule {
  type: 'horizontalRule';
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
  content?: undefined;
}

export interface PMImage {
  type: 'image';
  attrs: { src: string; alt?: string; title?: string };
  marks?: undefined;
  text?: undefined;
  content?: undefined;
}

export interface PMHardBreak {
  type: 'hardBreak';
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
  content?: undefined;
}

export interface PMTable {
  type: 'table';
  content: PMTableRow[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMTableRow {
  type: 'tableRow';
  content: PMTableCell[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMTableCell {
  type: 'tableCell' | 'tableHeader';
  content: PMNode[];
  attrs?: Record<string, unknown>;
  marks?: undefined;
  text?: undefined;
}

export interface PMCallout {
  type: 'callout';
  attrs: { type: 'info' | 'warning' | 'success' | 'error'; emoji?: string };
  content: PMNode[];
  marks?: undefined;
  text?: undefined;
}

export interface PMTransclusion {
  type: 'transclusion';
  attrs: { pageId: string; pageTitle: string; content?: PMNode };
  marks?: undefined;
  text?: undefined;
  content?: undefined;
}

// ---- Union types ----

/** Any ProseMirror block node variant */
export type PMBlockNode =
  | PMParagraph
  | PMHeading
  | PMBulletList
  | PMOrderedList
  | PMTaskList
  | PMCodeBlock
  | PMBlockquote
  | PMHorizontalRule
  | PMImage
  | PMTable
  | PMCallout
  | PMTransclusion;

/** A ProseMirror mark variant */
export type PMAnyMark =
  | { type: 'bold'; attrs?: Record<string, unknown> }
  | { type: 'italic'; attrs?: Record<string, unknown> }
  | { type: 'underline'; attrs?: Record<string, unknown> }
  | { type: 'strike'; attrs?: Record<string, unknown> }
  | { type: 'code'; attrs?: Record<string, unknown> }
  | PMLinkMark;

// ---- Type guards ----

/**
 * Check if a node is a text node
 */
export function isTextNode(node: PMNode): node is PMTextNode {
  return node.type === 'text' && typeof node.text === 'string';
}

/**
 * Check if a node has a content array
 */
export function hasContent(node: PMNode): node is PMNode & { content: PMNode[] } {
  return Array.isArray(node.content);
}
