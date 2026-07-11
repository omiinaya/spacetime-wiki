import React, { useEffect, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { api, SyncedBlock as SyncedBlockType } from '../lib/api';

export interface SyncedBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    syncedBlock: {
      insertSyncedBlock: (blockId: string, blockTitle: string) => ReturnType;
    };
  }
}

/**
 * SyncedBlockNode — Renders content from a synced block inline.
 * Stored in ProseMirror as a leaf node with attrs { blockId, blockTitle, content }.
 * Content is the resolved Prosemirror JSON of the synced block.
 * When the synced block is updated, all instances update automatically.
 */
export const SyncedBlockExtension = Node.create<SyncedBlockOptions>({
  name: 'syncedBlock',

  group: 'block',
  atom: true,
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      blockId: { default: '' },
      blockTitle: { default: '' },
      content: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-synced-block]',
        getAttrs: (el) => {
          if (typeof el === 'string') return {};
          const htmlEl = el as HTMLElement;
          return {
            blockId: htmlEl.getAttribute('data-synced-block-id') || '',
            blockTitle: htmlEl.getAttribute('data-synced-block-title') || '',
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-synced-block': '',
        'data-synced-block-id': node.attrs.blockId,
        'data-synced-block-title': node.attrs.blockTitle,
        class: 'synced-block my-3 rounded-lg border border-blue-300/30 bg-blue-500/5 p-3',
      }),
      [
        'div',
        {
          class:
            'synced-block-header flex items-center gap-2 mb-2 pb-1 border-b border-blue-300/20 text-xs font-medium text-blue-400/70',
        },
        ['span', {}, '🔄 Synced block:'],
        [
          'span',
          { class: 'font-semibold text-blue-300/90' },
          node.attrs.blockTitle || node.attrs.blockId,
        ],
      ],
      [
        'div',
        { class: 'synced-block-content prose prose-invert prose-sm max-w-none' },
        ...(node.attrs.content && typeof node.attrs.content === 'object'
          ? renderProseMirrorContent(node.attrs.content)
          : [['p', {}, '(Empty block)']]),
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SyncedBlockNodeView);
  },

  addCommands() {
    return {
      insertSyncedBlock:
        (blockId: string, blockTitle: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { blockId, blockTitle, content: null },
          });
        },
    };
  },
});

// ─── React Node View ──────────────────────────────────────────────────────────

/**
 * Recursively render ProseMirror JSON node tree as HTML elements.
 */
function renderProseMirrorContent(node: unknown): unknown[] {
  if (!node) return [];
  if (node.type === 'doc' && node.content) {
    return node.content.flatMap((c: unknown) => renderProseMirrorContent(c));
  }
  if (node.type === 'paragraph') {
    const children = node.content?.flatMap((c: unknown) => renderProseMirrorContent(c)) || [];
    return [['p', {}, ...children]];
  }
  if (node.type === 'heading') {
    const level = node.attrs?.level || 1;
    const children = node.content?.flatMap((c: unknown) => renderProseMirrorContent(c)) || [];
    return [[`h${level}`, {}, ...children]];
  }
  if (node.type === 'bulletList') {
    const items = node.content?.flatMap((c: unknown) => renderProseMirrorContent(c)) || [];
    return [['ul', {}, ...items]];
  }
  if (node.type === 'orderedList') {
    const items = node.content?.flatMap((c: unknown) => renderProseMirrorContent(c)) || [];
    return [['ol', {}, ...items]];
  }
  if (node.type === 'listItem') {
    const children = node.content?.flatMap((c: unknown) => renderProseMirrorContent(c)) || [];
    return [['li', {}, ...children]];
  }
  if (node.type === 'text') {
    let text: string = node.text || '';
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = ['strong', {}, text];
        else if (mark.type === 'italic') text = ['em', {}, text];
        else if (mark.type === 'code') text = ['code', {}, text];
        else if (mark.type === 'strike') text = ['s', {}, text];
        else if (mark.type === 'link') text = ['a', { href: mark.attrs?.href || '#' }, text];
      }
    }
    return [text];
  }
  if (node.type === 'hardBreak') return [['br', {}]];
  if (node.type === 'horizontalRule') return [['hr', {}]];
  if (node.type === 'codeBlock') {
    const lang = node.attrs?.language ? `language-${node.attrs.language}` : '';
    const code = node.content?.[0]?.text || '';
    return [['pre', {}, ['code', { class: lang }, code]]];
  }
  if (node.type === 'blockquote') {
    const children = node.content?.flatMap((c: unknown) => renderProseMirrorContent(c)) || [];
    return [['blockquote', {}, ...children]];
  }
  // Fallback: render as div
  const fallback = node.content?.flatMap((c: unknown) => renderProseMirrorContent(c)) || [];
  return [['div', {}, ...fallback]];
}

/**
 * SyncedBlockNodeView — React component that displays synced block content
 * and fetches the latest content from STDB if not provided.
 */
const SyncedBlockNodeView: React.FC<{ node: unknown }> = ({ node }) => {
  const [blockData, setBlockData] = useState<SyncedBlockType | null>(null);
  const [loading, setLoading] = useState(!node.attrs.content);

  useEffect(() => {
    if (node.attrs.blockId && !node.attrs.content) {
      api.syncedBlocks
        .get(node.attrs.blockId)
        .then((data) => {
          if (data) {
            setBlockData(data);
            try {
              const parsed = JSON.parse(data.content);
              node.attrs.content = parsed;
            } catch {
              /* ignore parse errors */
            }
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [node.attrs.blockId]);

  const title = blockData?.title || node.attrs.blockTitle || node.attrs.blockId;
  const content =
    node.attrs.content ||
    (blockData
      ? (() => {
          try {
            return JSON.parse(blockData.content);
          } catch {
            return null;
          }
        })()
      : null);

  return (
    <NodeViewWrapper className="synced-block my-3 rounded-lg border border-blue-300/30 bg-blue-500/5 p-3">
      <div className="synced-block-header flex items-center gap-2 mb-2 pb-1 border-b border-blue-300/20 text-xs font-medium text-blue-400/70">
        <span>🔄 Synced block:</span>
        <span className="font-semibold text-blue-300/90">{title}</span>
      </div>
      <div className="synced-block-content prose prose-invert prose-sm max-w-none">
        {loading ? (
          <p className="text-muted-foreground italic">Loading...</p>
        ) : content ? (
          renderProseMirrorContent(content).map((el, i) => {
            const Tag = el[0];
            const attrs = el[1] || {};
            const children = el.slice(2) || [];
            return (
              <Tag key={i} {...attrs}>
                {children}
              </Tag>
            );
          })
        ) : (
          <p className="text-muted-foreground italic">(Empty block)</p>
        )}
      </div>
    </NodeViewWrapper>
  );
};
