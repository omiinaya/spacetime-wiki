import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAWIO_EMBED_URL = "https://embed.diagrams.net/?embed=1&spin=1&proto=json&configure=1";

// ─── Options ─────────────────────────────────────────────────────────────────

export interface DrawioOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    drawio: {
      setDrawio: (options: { src: string }) => ReturnType;
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeDrawioXml(data: string): string {
  // draw.io data can be plain XML or base64-encoded XML with ?xml prefix check
  if (data.startsWith("<?xml") || data.startsWith("<mx")) return data;
  try {
    const decoded = atob(data);
    if (decoded.startsWith("<?xml") || decoded.startsWith("<mx")) return decoded;
  } catch {
    // not base64
  }
  return data;
}

function encodeDrawioData(xml: string): string {
  // Encode XML for draw.io embed URL fragment
  return btoa(unescape(encodeURIComponent(xml)));
}

function extractSvgFromDrawioExport(data: string): string | null {
  // When draw.io exports via postMessage, it may include svg in the response
  try {
    const parsed = JSON.parse(data);
    if (parsed.svg) return parsed.svg;
    if (parsed.xml) {
      // Try to find SVG inline in the XML
      const svgMatch = parsed.xml.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);
      if (svgMatch) return svgMatch[0];
    }
  } catch {
    // Not JSON, try direct XML parsing
    const svgMatch = data.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);
    if (svgMatch) return svgMatch[0];
  }
  return null;
}

// ─── Draw.io Node View ───────────────────────────────────────────────────────

const DrawioNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
}) => {
  const { src } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editSrc, setEditSrc] = useState(src || "");
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const [renderError, setRenderError] = useState(false);

  // Extract SVG preview from the stored data
  useEffect(() => {
    if (!src) {
      setSvgPreview(null);
      return;
    }
    const svg = extractSvgFromDrawioExport(src);
    if (svg) {
      setSvgPreview(svg);
      setRenderError(false);
    } else {
      // Check if src itself is an SVG
      const svgMatch = src.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        setSvgPreview(svgMatch[0]);
        setRenderError(false);
      } else {
        setSvgPreview(null);
        setRenderError(false);
      }
    }
  }, [src]);

  // Listen for postMessage from draw.io iframe
  const handleMessage = useCallback((event: MessageEvent) => {
    if (!showEditor) return;
    try {
      const msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (msg.event === "init") {
        // Send the XML data to draw.io to load
        const xml = decodeDrawioXml(editSrc || getDefaultDiagram());
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              action: "load",
              xml,
            }),
            "*"
          );
        }
      } else if (msg.event === "save") {
        // User saved from draw.io
        const newXml = msg.xml || "";
        const newSvg = msg.svg || "";
        // Store both XML and SVG for preview
        const combined = newSvg
          ? JSON.stringify({ xml: newXml, svg: newSvg })
          : newXml;
        updateAttributes({ src: combined });
        setEditSrc(combined);
        setShowEditor(false);
      } else if (msg.event === "exit") {
        setShowEditor(false);
      }
    } catch {
      // Not a JSON message, ignore
    }
  }, [showEditor, editSrc, updateAttributes]);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const handleOpenEditor = () => {
    setEditSrc(src || getDefaultDiagram());
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCloseEditor();
    }
  };

  return (
    <div
      className={`drawio-wrapper my-4 rounded-lg border ${
        selected ? "border-primary/50 ring-2 ring-primary/20" : "border-border"
      } bg-[#1a1a2e]/50 overflow-hidden`}
      contentEditable={false}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/50">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Diagram (draw.io)
        </span>
        <div className="flex items-center gap-1">
          {!showEditor && (
            <button
              onClick={handleOpenEditor}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[11px]"
              title="Edit diagram with draw.io"
            >
              {src ? "Edit" : "Create diagram"}
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      {!showEditor ? (
        <div className="p-4 flex justify-center overflow-x-auto min-h-[80px] items-center">
          {svgPreview ? (
            <div
              className="drawio-svg max-w-full"
              dangerouslySetInnerHTML={{ __html: svgPreview }}
            />
          ) : src ? (
            <div className="text-xs text-muted-foreground/50 text-center p-4">
              <p className="font-medium text-muted-foreground/70 mb-1">Draw.io diagram</p>
              <p className="text-[10px]">Double-click or press "Edit" to open editor</p>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/50 text-center p-4">
              <p className="font-medium text-muted-foreground/70 mb-1">No diagram yet</p>
              <p className="text-[10px]">Click "Create diagram" to start</p>
            </div>
          )}
        </div>
      ) : (
        /* Draw.io editor iframe */
        <div className="relative" style={{ height: "500px" }} onKeyDown={handleKeyDown}>
          <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/50 bg-background/80 px-2 py-1 rounded">
              Editing in draw.io
            </span>
            <button
              onClick={handleCloseEditor}
              className="p-1 rounded bg-background/80 text-muted-foreground hover:text-foreground transition-colors text-xs border border-border/50"
              title="Close editor"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <iframe
            ref={iframeRef}
            src={DRAWIO_EMBED_URL}
            className="w-full h-full rounded-lg"
            style={{ border: "none" }}
            title="Draw.io Editor"
          />
        </div>
      )}
    </div>
  );
};

function getDefaultDiagram(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile>
  <diagram id="default" name="Page-1">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="2" value="Hello&#10;World!" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#3b82f6;fontColor=#ffffff;strokeColor=#2563eb;" vertex="1" parent="1">
          <mxGeometry x="320" y="240" width="160" height="80" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

// ─── Extension ─────────────────────────────────────────────────────────────────

export const Drawio = Node.create<DrawioOptions>({
  name: "drawio",

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
        default: "",
        parseHTML: (el) => {
          const container = el as HTMLElement;
          return (
            container.getAttribute("data-drawio-src") ||
            container.getAttribute("data-src") ||
            ""
          );
        },
        renderHTML: (attrs) => {
          if (!attrs.src) return {};
          return { "data-drawio-src": attrs.src };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-drawio-src]",
      },
      {
        tag: "div.drawio-diagram",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const src = node.attrs.src || "";
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-drawio-src": src,
        class: "drawio-diagram",
      }),
      "<!-- draw.io diagram -->",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawioNodeView);
  },

  addCommands() {
    return {
      setDrawio:
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
