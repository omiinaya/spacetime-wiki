import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Lazy mermaid loader ───────────────────────────────────────────────────────
// Dynamically import mermaid (~800KB with all diagram types) only when the first
// mermaid node is rendered. This avoids adding it to the initial bundle.

let _mermaid: any = null;
let _mermaidPromise: Promise<void> | null = null;

async function ensureMermaid(): Promise<void> {
  if (_mermaid) return;
  if (!_mermaidPromise) {
    _mermaidPromise = import("mermaid").then(async (mod) => {
      _mermaid = mod.default || mod;
      _mermaid.initialize({
        theme: "dark",
        startOnLoad: false,
        themeVariables: {
          background: "#1a1a2e",
          primaryColor: "#3b82f6",
          secondaryColor: "#8b5cf6",
          tertiaryColor: "#1e293b",
          primaryTextColor: "#e2e8f0",
          secondaryTextColor: "#94a3b8",
          lineColor: "#475569",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "14px",
        },
      });
    });
  }
  await _mermaidPromise;
}

// ─── Options ───────────────────────────────────────────────────────────────────

export interface MermaidOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      setMermaid: (options: { src: string }) => ReturnType;
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

// ─── Mermaid Node View ─────────────────────────────────────────────────────────

const MermaidNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
}) => {
  const { src } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editSrc, setEditSrc] = useState(src || "");
  const [renderError, setRenderError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Render the diagram when src changes
  useEffect(() => {
    if (!svgContainerRef.current || !src) return;
    const container = svgContainerRef.current;
    container.setAttribute("data-mermaid-src", src);
    container.textContent = src;
    setRenderError(false);
    setLoading(true);

    ensureMermaid()
      .then(() => {
        if (!svgContainerRef.current) return;
        return _mermaid
          .run({
            nodes: [svgContainerRef.current],
            suppressErrors: true,
          })
          .catch(() => {
            svgContainerRef.current!.innerHTML =
              `<div class="mermaid-error p-4 text-red-400 text-sm border border-red-500/30 rounded-lg bg-red-500/5">
                <span class="font-semibold">⚠ Mermaid syntax error</span>
                <pre class="mt-2 text-xs text-red-300/70 whitespace-pre-wrap font-mono">${escapeHtml(src.substring(0, 500))}</pre>
              </div>`;
          });
      })
      .finally(() => setLoading(false));
  }, [src]);

  const handleDoubleClick = () => {
    setEditSrc(src || "");
    setShowEditor(true);
  };

  const handleSave = () => {
    updateAttributes({ src: editSrc });
    setShowEditor(false);
  };

  const handleCancel = () => {
    setEditSrc(src || "");
    setShowEditor(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div
      className={`mermaid-wrapper my-4 rounded-lg border ${
        selected ? "border-primary/50 ring-2 ring-primary/20" : "border-border"
      } bg-[#1a1a2e]/50 overflow-hidden`}
      contentEditable={false}
      onDoubleClick={handleDoubleClick}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/50">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16" />
            <path d="M6 16l6-12 6 12" />
            <path d="M8 12h8" />
          </svg>
          Diagram
        </span>
        <div className="flex items-center gap-1">
          {loading && (
            <span className="text-[10px] text-muted-foreground/50">Rendering...</span>
          )}
          <button
            onClick={handleDoubleClick}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[11px]"
            title="Edit diagram source"
          >
            Edit source
          </button>
        </div>
      </div>

      {/* Diagram area */}
      <div className="p-4 flex justify-center overflow-x-auto">
        <div
          ref={svgContainerRef}
          className="mermaid max-w-full"
          data-mermaid-src={src}
        >
          {loading ? "Loading diagram engine..." : src || "<!-- empty diagram -->"}
        </div>
      </div>

      {/* Inline editor modal */}
      {showEditor && (
        <div className="border-t border-border/50">
          <div className="p-3">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Mermaid diagram source:
            </label>
            <textarea
              value={editSrc}
              onChange={(e) => setEditSrc(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-32 px-3 py-2 rounded-lg border border-border bg-[#0a0a1a] text-sm font-mono text-foreground placeholder:text-muted-foreground/40 outline-hidden focus:border-primary/50 resize-y"
              placeholder={`graph TD\n  A[Start] --> B[Process]\n  B --> C[End]`}
              autoFocus
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground/50">
                {editSrc.length > 0
                  ? `${editSrc.split('\n').length} lines`
                  : "Empty diagram"}
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
                  {src ? "Update" : "Insert"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Extension ─────────────────────────────────────────────────────────────────

export const Mermaid = Node.create<MermaidOptions>({
  name: "mermaid",

  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: "graph TD\n  A[Hello] --> B[World]",
        parseHTML: (el) => {
          const container = el as HTMLElement;
          return (
            container.getAttribute("data-mermaid-src") ||
            container.textContent ||
            ""
          );
        },
        renderHTML: (attrs) => {
          if (!attrs.src) return {};
          return { "data-mermaid-src": attrs.src };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-mermaid-src]",
      },
      {
        tag: "div.mermaid",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const src = node.attrs.src || "";
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-mermaid-src": src,
        class: "mermaid-wrapper my-4 rounded-lg border border-border bg-[#1a1a2e]/50 p-4 overflow-x-auto flex justify-center",
      }),
      src,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },

  addCommands() {
    return {
      setMermaid:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
