import { mergeAttributes, Node, nodeInputRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import React, { useState, useEffect, useCallback, useRef } from "react";

// ─── Image node options ───────────────────────────────────────────────────────

export interface ImageEnhancedOptions {
  HTMLAttributes: Record<string, any>;
  inline: boolean;
  allowBase64: boolean;
  onImageUpload?: (file: File) => Promise<string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageEnhanced: {
      setImageEnhanced: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: string;
        align?: "left" | "center" | "right";
        caption?: string;
        imageId?: string;
      }) => ReturnType;
    };
  }
}

// ─── Image Node View ─────────────────────────────────────────────────────────

const ImageNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
  editor,
}) => {
  const { src, alt, title, width, align, caption } = node.attrs;
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(caption || "");
  const [resizing, setResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCaptionText(caption || "");
  }, [caption]);

  // ── Resize drag ──────────────────────────────

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);
      setStartX(e.clientX);
      setStartWidth(imgRef.current?.offsetWidth || 300);
    },
    [],
  );

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      updateAttributes({ width: `${Math.round(newWidth)}px` });
    };
    const handleMouseUp = () => setResizing(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, startX, startWidth, updateAttributes]);

  // ── Caption editing ──────────────────────────

  const handleCaptionBlur = () => {
    setEditingCaption(false);
    if (captionText !== (caption || "")) {
      updateAttributes({ caption: captionText });
    }
  };

  const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setCaptionText(caption || "");
      setEditingCaption(false);
    }
  };

  // ── Styles ───────────────────────────────────

  const alignClass =
    align === "left"
      ? "ml-0 mr-auto"
      : align === "right"
        ? "ml-auto mr-0"
        : "mx-auto";

  const maxWidth = width || "100%";

  return (
    <div
      className={`image-wrapper my-4 relative group/image-wrapper ${alignClass} ${selected ? "ring-2 ring-primary/50 rounded-lg" : ""}`}
      style={{ maxWidth: "100%" }}
      contentEditable={false}
    >
      {/* Drag handle for reordering */}
      <div
        className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/image-wrapper:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        contentEditable={false}
        draggable={true}
        data-drag-handle
      >
        <div className="w-1.5 h-8 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50" />
      </div>
      <div className="relative inline-block group/image" style={{ maxWidth: "100%" }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          title={title || ""}
          className="rounded-lg max-w-full h-auto block select-none"
          style={{ width: maxWidth }}
          draggable={false}
        />
        {/* Resize handle (bottom-right corner) */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-0 group-hover/image:opacity-100 transition-opacity flex items-end justify-end"
          onMouseDown={handleResizeStart}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 10 10"
            className="text-white drop-shadow-md"
          >
            <path
              d="M0 10h10L10 0C5 5 0 10 0 10z"
              fill="currentColor"
              fillOpacity="0.7"
            />
          </svg>
        </div>
      </div>

      {/* Caption */}
      {editingCaption ? (
        <input
          className="w-full mt-1 bg-transparent text-center text-sm text-muted-foreground/70 border-b border-border/50 outline-none focus:border-primary/50 px-2 py-0.5"
          value={captionText}
          onChange={(e) => setCaptionText(e.target.value)}
          onBlur={handleCaptionBlur}
          onKeyDown={handleCaptionKeyDown}
          autoFocus
          placeholder="Add caption..."
        />
      ) : caption ? (
        <p
          className="mt-1 text-center text-sm text-muted-foreground/60 cursor-text select-none hover:text-muted-foreground/80 transition-colors"
          onClick={() => setEditingCaption(true)}
        >
          {caption}
        </p>
      ) : selected ? (
        <p
          className="mt-1 text-center text-sm text-muted-foreground/30 cursor-text select-none hover:text-muted-foreground/60 transition-colors italic"
          onClick={() => setEditingCaption(true)}
        >
          Add caption...
        </p>
      ) : null}
    </div>
  );
};

// ─── Extension ───────────────────────────────────────────────────────────────

export const ImageEnhanced = Node.create<ImageEnhancedOptions>({
  name: "imageEnhanced",

  group: "block",
  inline: false,
  draggable: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      inline: false,
      allowBase64: true,
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => (el as HTMLImageElement).getAttribute("src"),
        renderHTML: (attrs) => ({ src: attrs.src }),
      },
      alt: {
        default: null,
        parseHTML: (el) => (el as HTMLImageElement).getAttribute("alt"),
        renderHTML: (attrs) => ({ alt: attrs.alt }),
      },
      title: {
        default: null,
        parseHTML: (el) => (el as HTMLImageElement).getAttribute("title"),
        renderHTML: (attrs) => ({ title: attrs.title }),
      },
      width: {
        default: null,
        parseHTML: (el) => (el as HTMLImageElement).getAttribute("width"),
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { style: attrs.width ? `width:${attrs.width};` : "" };
        },
      },
      align: {
        default: "center",
        parseHTML: (el) => {
          const img = el as HTMLImageElement;
          return (
            img.getAttribute("data-align") ||
            img.getAttribute("align") ||
            "center"
          );
        },
        renderHTML: (attrs) => {
          if (!attrs.align || attrs.align === "center") return {};
          return { "data-align": attrs.align };
        },
      },
      caption: {
        default: "",
        parseHTML: (el) => {
          const parent = el.parentElement;
          if (!parent) return "";
          const prev = parent.previousElementSibling;
          if (prev?.classList.contains("image-caption-container")) {
            const p = prev.querySelector("p.image-caption");
            return p?.textContent || "";
          }
          return "";
        },
        renderHTML: (attrs) => ({}),
      },
      imageId: {
        default: null,
        parseHTML: (el) => (el as HTMLImageElement).getAttribute("data-image-id"),
        renderHTML: (attrs) => {
          if (!attrs.imageId) return {};
          return { "data-image-id": attrs.imageId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-image-enhanced]",
      },
      {
        tag: "img[src]",
        getAttrs: (el) => {
          const img = el as HTMLImageElement;
          if (img.closest("[data-image-enhanced]")) return false;
          const parent = img.parentElement;
          if (parent?.closest("p, h1, h2, h3, h4, h5, h6, span")) return false;
          return {};
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs;
    const width = attrs.width || "100%";

    // Build alignment class
    let justifyClass = "";
    if (attrs.align === "left") justifyClass = " flex justify-start";
    else if (attrs.align === "right") justifyClass = " flex justify-end";
    else justifyClass = " flex justify-center";

    // Children array
    const children: any[] = [
      [
        "div",
        { class: "relative inline-block" + justifyClass, style: `max-width:100%;` },
        [
          "img",
          {
            src: attrs.src,
            alt: attrs.alt || "",
            title: attrs.title || "",
            style: `width:${width};max-width:100%;`,
            class: "rounded-lg max-w-full h-auto block",
            draggable: "false",
          },
        ],
      ],
    ];

    // Add caption if present
    if (attrs.caption) {
      children.push([
        "p",
        {
          class: "image-caption mt-1 text-center text-sm text-muted-foreground/60",
        },
        attrs.caption,
      ]);
    }

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-image-enhanced": "true",
        class: `image-wrapper my-4${justifyClass}`,
        style: "max-width:100%;",
      }),
      children,
    ] as const;
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },

  addCommands() {
    return {
      setImageEnhanced:
        (options) =>
        ({ commands }) => {
          const attrs = {
            ...options,
            imageId: options.imageId || crypto.randomUUID?.() || `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          };
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /!\[(.+|:?)\]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/,
        type: this.type,
        getAttributes: (match) => {
          const [, alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },
});
