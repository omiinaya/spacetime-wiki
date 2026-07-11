import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useRef } from 'react';

// ─── Lazy katex loader ───────────────────────────────────────────────────────
// Dynamically import katex (129K) only when a math node is rendered for the
// first time. This avoids adding katex to the initial bundle.
let _katex: unknown = null;
let _katexPromise: Promise<void> | null = null;

function ensureKatex(): Promise<void> {
  if (_katex) return Promise.resolve();
  if (!_katexPromise) {
    _katexPromise = import('katex').then((mod) => {
      _katex = mod.default || mod;
    });
  }
  return _katexPromise;
}

// ─── KaTeX render helpers ────────────────────────────────────────────────────

function renderInlineMath(tex: string): string {
  if (_katex) {
    try {
      return _katex.renderToString(tex, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return `<span class="math-error text-red-400">${escapeHtml(tex)}</span>`;
    }
  }
  // katex not loaded yet — return raw tex; the React NodeView will re-render
  return `<span class="math-loading">${escapeHtml(tex)}</span>`;
}

function renderBlockMath(tex: string): string {
  if (_katex) {
    try {
      return _katex.renderToString(tex, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return `<div class="math-error text-red-400">${escapeHtml(tex)}</div>`;
    }
  }
  return `<div class="math-loading">${escapeHtml(tex)}</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Shared KaTeX render React component ─────────────────────────────────────
// Used by both MathInlineNodeView and MathBlockNodeView

function KatexRenderer({ tex, displayMode }: { tex: string; displayMode: boolean }) {
  const containerRef = useRef<HTMLSpanElement | HTMLDivElement>(null);
  const [loading, setLoading] = useState(!_katex);
  const [error, setError] = useState(false);

  useEffect(() => {
    ensureKatex().then(() => {
      if (!containerRef.current) return;
      try {
        const html = _katex.renderToString(tex || '', {
          throwOnError: false,
          displayMode,
        });
        containerRef.current.innerHTML = html;
        setLoading(false);
        setError(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    });
  }, [tex, displayMode]);

  if (loading) {
    return React.createElement(displayMode ? 'div' : 'span', {
      ref: containerRef,
      className: 'math-loading text-muted-foreground text-sm',
    });
  }

  return React.createElement(displayMode ? 'div' : 'span', {
    ref: containerRef,
    'data-error': error ? 'true' : undefined,
    className: error
      ? 'math-error text-red-400'
      : displayMode
        ? 'math-render max-w-full'
        : 'math-render inline',
  });
}

// ─── MathInline React Node View ──────────────────────────────────────────────

const MathInlineNodeView: React.FC<NodeViewProps> = ({ node }) => {
  const tex = node.attrs.tex || '';
  return (
    <span className="math-inline" contentEditable={false}>
      <KatexRenderer tex={tex} displayMode={false} />
    </span>
  );
};

// ─── Inline Math Node ($...$) ─────────────────────────────────────────────────

export interface MathInlineOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathInline: {
      setMathInline: (attrs: { tex: string }) => ReturnType;
    };
  }
}

export const MathInline = Node.create<MathInlineOptions>({
  name: 'mathInline',

  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tex: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-tex') || '',
        renderHTML: (attrs) => ({ 'data-tex': attrs.tex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-math-inline]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tex = node.attrs.tex || '';
    const rendered = renderInlineMath(tex);
    return [
      'span',
      mergeAttributes({ 'data-math-inline': '', class: 'math-inline' }, HTMLAttributes),
      rendered,
    ];
  },

  renderText({ node }) {
    return `$${node.attrs.tex}$`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathInlineNodeView, {
      // Inline node views need to be rendered inline
      as: 'span',
    });
  },

  addCommands() {
    return {
      setMathInline:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});

// ─── Block Math Node View ─────────────────────────────────────────────────────

const MathBlockNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const { tex } = node.attrs;
  const [showEditor, setShowEditor] = useState(false);
  const [editTex, setEditTex] = useState(tex || '');
  const [renderError, setRenderError] = useState(false);
  const [katexLoading, setKatexLoading] = useState(!_katex);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load katex if not already loaded, then render
  useEffect(() => {
    ensureKatex().then(() => {
      setKatexLoading(false);
      if (!previewRef.current) return;
      try {
        const html = _katex.renderToString(editTex || '', {
          throwOnError: false,
          displayMode: true,
        });
        previewRef.current.innerHTML = html;
        setRenderError(false);
      } catch {
        setRenderError(true);
      }
    });
  }, [tex, editTex]);

  const handleDoubleClick = () => {
    setEditTex(tex || '');
    setShowEditor(true);
  };

  const handleSave = () => {
    updateAttributes({ tex: editTex });
    setShowEditor(false);
  };

  const handleCancel = () => {
    setEditTex(tex || '');
    setShowEditor(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      className={`math-block-wrapper my-4 rounded-lg border ${
        selected ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border'
      } bg-muted/20 overflow-hidden`}
      contentEditable={false}
      onDoubleClick={handleDoubleClick}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/50">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7V4h16v3" />
            <path d="M9 20h6" />
            <path d="M12 4v16" />
          </svg>
          LaTeX Math
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDoubleClick}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[11px]"
            title="Edit LaTeX source"
          >
            Edit source
          </button>
        </div>
      </div>

      {/* Rendered math area */}
      <div className="p-5 flex justify-center overflow-x-auto min-h-[48px] items-center">
        {katexLoading ? (
          <div className="text-muted-foreground text-sm animate-pulse">Loading KaTeX...</div>
        ) : (
          <div ref={previewRef} className="math-render max-w-full" data-tex={tex} />
        )}
      </div>

      {/* Inline editor */}
      {showEditor && (
        <div className="border-t border-border/50">
          <div className="p-3">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              LaTeX source:
            </label>
            <textarea
              value={editTex}
              onChange={(e) => setEditTex(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-24 px-3 py-2 rounded-lg border border-border bg-[#0a0a0a] text-sm font-mono text-foreground placeholder:text-muted-foreground/40 outline-hidden focus:border-primary/50 resize-y"
              placeholder={'E = mc^2'}
              autoFocus
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground/50">
                {editTex.length > 0 ? `${editTex.split('\n').length} lines` : 'Empty expression'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                >
                  {tex ? 'Update' : 'Insert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Block Math Node ($$...$$) ────────────────────────────────────────────────

export interface MathBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathBlock: {
      setMathBlock: (attrs: { tex: string }) => ReturnType;
    };
  }
}

export const MathBlock = Node.create<MathBlockOptions>({
  name: 'mathBlock',

  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tex: {
        default: 'E = mc^2',
        parseHTML: (el) => el.getAttribute('data-tex') || '',
        renderHTML: (attrs) => ({ 'data-tex': attrs.tex }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-math-block]' }, { tag: 'div.math-block' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tex = node.attrs.tex || '';
    const rendered = renderBlockMath(tex);
    return [
      'div',
      mergeAttributes(
        {
          'data-math-block': '',
          class:
            'math-block my-4 p-4 rounded-lg border border-border bg-muted/10 overflow-x-auto text-center',
        },
        HTMLAttributes,
      ),
      rendered,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockNodeView);
  },

  renderText({ node }) {
    return `$$\n${node.attrs.tex}\n$$`;
  },

  addCommands() {
    return {
      setMathBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
