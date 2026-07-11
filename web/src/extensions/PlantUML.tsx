import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
// @ts-expect-error - no types
import plantumlEncoder from 'plantuml-encoder';

// ─── Default server URL (configurable) ───────────────────────────────────────

const DEFAULT_PLANTUML_SERVER = 'https://www.plantuml.com/plantuml';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface PlantUMLOptions {
  HTMLAttributes: Record<string, unknown>;
  serverUrl?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    plantuml: {
      setPlantUML: (options: { src: string }) => ReturnType;
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getDiagramUrl(src: string, serverUrl: string = DEFAULT_PLANTUML_SERVER): string {
  const encoded = plantumlEncoder.encode(src);
  return `${serverUrl}/svg/${encoded}`;
}

// ─── PlantUML Node View ─────────────────────────────────────────────────────

const PlantUMLNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
}) => {
  const { src } = node.attrs;
  const [showEditor, setShowEditor] = useState(false);
  const [editSrc, setEditSrc] = useState(src || '');
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const serverUrl =
    (
      editor.extensionManager.extensions.find((ext: unknown) => ext.name === 'plantuml')
        ?.options as PlantUMLOptions
    )?.serverUrl || DEFAULT_PLANTUML_SERVER;

  const diagramUrl = src ? getDiagramUrl(src, serverUrl) : '';

  const handleDoubleClick = () => {
    setEditSrc(src || '');
    setShowEditor(true);
  };

  const handleSave = () => {
    updateAttributes({ src: editSrc });
    setShowEditor(false);
    setImgError(false);
    setImgLoaded(false);
  };

  const handleCancel = () => {
    setEditSrc(src || '');
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

  const handleImgError = () => {
    setImgError(true);
    setImgLoaded(true);
  };

  const handleImgLoad = () => {
    setImgLoaded(true);
    setImgError(false);
  };

  return (
    <div
      className={`plantuml-wrapper my-4 rounded-lg border ${
        selected ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border'
      } bg-[#1a1a2e]/50 overflow-hidden`}
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
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          PlantUML
        </span>
        <div className="flex items-center gap-1">
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
      <div className="p-4 flex justify-center overflow-x-auto min-h-[60px]">
        {src ? (
          <>
            {!imgLoaded && !imgError && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Rendering diagram...
              </div>
            )}
            {imgError && (
              <div className="text-red-400 text-sm p-4 text-center border border-red-500/30 rounded-lg bg-red-500/5">
                <span className="font-semibold">⚠ Failed to render diagram</span>
                <p className="mt-1 text-xs text-red-300/70">
                  Check the PlantUML syntax or server availability.
                </p>
              </div>
            )}
            <img
              src={diagramUrl}
              alt="PlantUML Diagram"
              className={`max-w-full h-auto ${imgLoaded ? 'block' : 'hidden'}`}
              onError={handleImgError}
              onLoad={handleImgLoad}
            />
          </>
        ) : (
          <div className="text-muted-foreground text-sm italic p-4">
            Empty diagram — double-click to edit
          </div>
        )}
      </div>

      {/* Inline editor modal */}
      {showEditor && (
        <div className="border-t border-border/50">
          <div className="p-3">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              PlantUML diagram source:
            </label>
            <textarea
              value={editSrc}
              onChange={(e) => setEditSrc(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-36 px-3 py-2 rounded-lg border border-border bg-[#0a0a1a] text-sm font-mono text-foreground placeholder:text-muted-foreground/40 outline-hidden focus:border-primary/50 resize-y"
              placeholder={`@startuml\nAlice -> Bob: Hello\nBob -> Alice: Hi!\n@enduml`}
              autoFocus
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-muted-foreground/50">
                {editSrc.length > 0 ? `${editSrc.split('\n').length} lines` : 'Empty diagram'}
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
                  {src ? 'Update' : 'Insert'}
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

export const PlantUML = Node.create<PlantUMLOptions>({
  name: 'plantuml',

  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      serverUrl: DEFAULT_PLANTUML_SERVER,
    };
  },

  addAttributes() {
    return {
      src: {
        default: `@startuml\nAlice -> Bob: Hello\nBob -> Alice: Hi!\n@enduml`,
        parseHTML: (el) => {
          const container = el as HTMLElement;
          return container.getAttribute('data-plantuml-src') || container.textContent || '';
        },
        renderHTML: (attrs) => {
          if (!attrs.src) return {};
          return { 'data-plantuml-src': attrs.src };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-plantuml-src]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const src = node.attrs.src || '';
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-plantuml-src': src,
        class:
          'plantuml-wrapper my-4 rounded-lg border border-border bg-[#1a1a2e]/50 p-4 overflow-x-auto flex justify-center',
      }),
      src,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PlantUMLNodeView);
  },

  addCommands() {
    return {
      setPlantUML:
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
