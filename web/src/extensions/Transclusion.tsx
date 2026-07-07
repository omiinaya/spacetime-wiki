import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { PMNode, PMTextNode } from "../lib/prosemirror-types";

export interface TransclusionOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    transclusion: {
      insertTransclusion: (pageId: string, pageTitle: string) => ReturnType;
    };
  }
}

/**
 * TransclusionNode — Renders content from another page inline.
 * Stored in ProseMirror as a leaf node with attrs { pageId, pageTitle, content }.
 * The content is the resolved ProseMirror JSON of the referenced page.
 */
export const Transclusion = Node.create<TransclusionOptions>({
  name: "transclusion",

  group: "block",
  atom: true,
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      pageId: { default: "" },
      pageTitle: { default: "" },
      content: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-transclusion]",
        getAttrs: (el) => {
          if (typeof el === "string") return {};
          const htmlEl = el as HTMLElement;
          return {
            pageId: htmlEl.getAttribute("data-transclusion-page-id") || "",
            pageTitle: htmlEl.getAttribute("data-transclusion-page-title") || "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-transclusion": "",
        "data-transclusion-page-id": node.attrs.pageId,
        "data-transclusion-page-title": node.attrs.pageTitle,
        class: "transclusion-block my-3 rounded-lg border border-primary/20 bg-primary/5 p-3",
      }),
      [
        "div",
        { class: "transclusion-header flex items-center gap-2 mb-2 pb-1 border-b border-primary/10 text-xs font-medium text-primary/60" },
        ["span", {}, "📄 Included from:"],
        ["span", { class: "font-semibold text-primary/80" }, node.attrs.pageTitle || node.attrs.pageId],
      ],
      [
        "div",
        { class: "transclusion-content prose prose-invert prose-sm max-w-none" },
        ...(node.attrs.content && typeof node.attrs.content === "object"
          ? renderProseMirrorContent(node.attrs.content as PMNode)
          : [[ "p", {}, "(Empty page)" ]]
        ),
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TransclusionNodeView as any);
  },

  addCommands() {
    return {
      insertTransclusion:
        (pageId, pageTitle) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { pageId, pageTitle, content: null },
          });
        },
    };
  },
});

/**
 * Recursively render ProseMirror JSON node tree as HTML elements.
 * This is used inside renderHTML to inline the transcluded content.
 */
function renderProseMirrorContent(node: PMNode): unknown[] {
  if (!node) return [];
  if (node.type === "doc" && node.content) {
    return node.content.flatMap((c: PMNode) => renderProseMirrorContent(c));
  }
  if (node.type === "paragraph") {
    const children = node.content?.flatMap((c: PMNode) => renderProseMirrorContent(c)) || [];
    return [["p", { class: "mb-1 leading-relaxed" }, ...children]];
  }
  if (node.type === "text") {
    let text = (node as PMTextNode).text || "";
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") text = `**${text}**`;
        if (mark.type === "italic") text = `*${text}*`;
        if (mark.type === "code") text = `\`${text}\``;
        if (mark.type === "strike") text = `~~${text}~~`;
        if (mark.type === "link") text = `<a href="${(mark.attrs as { href?: string })?.href || ""}" class="text-primary underline">${text}</a>`;
      }
    }
    // Escape HTML special chars
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (node.marks?.some((m) => m.type === "link")) {
      // Already handled above
    }
    return [text];
  }
  if (node.type === "heading") {
    const level = (node.attrs as { level?: number })?.level || 1;
    const text = node.content?.map((c: PMNode) => c.text || "").join("") || "";
    return [[`h${level}`, { class: `text-${["", "xl", "lg", "base"][level] || "base"} font-semibold mt-2 mb-1` }, text]];
  }
  if (node.type === "bulletList") {
    const items = node.content?.flatMap((c: PMNode) => renderProseMirrorContent(c)) || [];
    return [["ul", { class: "list-disc pl-4 my-1" }, ...items]];
  }
  if (node.type === "orderedList") {
    const items = node.content?.flatMap((c: PMNode) => renderProseMirrorContent(c)) || [];
    return [["ol", { class: "list-decimal pl-4 my-1" }, ...items]];
  }
  if (node.type === "listItem") {
    const children = node.content?.flatMap((c: PMNode) => renderProseMirrorContent(c)) || [];
    return [["li", { class: "mb-0.5" }, ...children]];
  }
  if (node.type === "codeBlock") {
    const text = node.content?.map((c: PMNode) => c.text || "").join("") || "";
    return [["pre", { class: "bg-muted p-2 rounded text-xs overflow-x-auto my-1" }, ["code", {}, text]]];
  }
  if (node.type === "blockquote") {
    const children = node.content?.flatMap((c: PMNode) => renderProseMirrorContent(c)) || [];
    return [["blockquote", { class: "border-l-2 border-muted-foreground/20 pl-3 my-1 italic" }, ...children]];
  }
  if (node.type === "horizontalRule") {
    return [["hr", { class: "my-2 border-border" }]];
  }
  if (node.type === "image") {
    const src = (node.attrs as { src?: string })?.src || "";
    const alt = (node.attrs as { alt?: string })?.alt || "";
    return [["img", { src, alt, class: "max-w-full h-auto rounded my-1" }]];
  }
  if (node.type === "taskList") {
    const items = node.content?.flatMap((c: PMNode) => renderProseMirrorContent(c)) || [];
    return [["ul", { class: "list-none pl-0 my-1" }, ...items]];
  }
  if (node.type === "taskItem") {
    const checked = (node.attrs as { checked?: boolean })?.checked ? "checked" : "";
    const text = node.content?.flatMap((c: PMNode) => renderProseMirrorContent(c)) || [];
    return [[
      "li",
      { class: "flex items-start gap-2 mb-0.5" },
      ["input", { type: "checkbox", checked, disabled: true, class: "mt-1" }],
      ["span", {}, ...text],
    ]];
  }
  // Fallback: recurse into content
  if (node.content) {
    return node.content.flatMap((c: PMNode) => renderProseMirrorContent(c));
  }
  return [];
}

/**
 * React Node View — used by Tiptap's node view system for interactive rendering.
 * This is the fallback when the React rendering path is used.
 */
function TransclusionNodeView({ node }: { node: { attrs: { pageTitle: string; pageId: string; content: PMNode | null } } }) {
  const { pageTitle, pageId, content } = node.attrs;

  // Simple inline rendering of the transcluded page title
  return (
    <NodeViewWrapper className="transclusion-block my-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="transclusion-header flex items-center gap-2 mb-2 pb-1 border-b border-primary/10 text-xs font-medium text-primary/60">
        <span>📄 Included from:</span>
        <span className="font-semibold text-primary/80">{pageTitle || pageId}</span>
      </div>
      <div className="transclusion-content prose prose-invert prose-sm max-w-none">
        {content ? (
          <TransclusionContentRenderer content={content} />
        ) : (
          <p className="text-muted-foreground italic">Loading...</p>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/**
 * Recursively renders ProseMirror JSON content into React elements.
 */
function TransclusionContentRenderer({ content }: { content: PMNode }) {
  if (!content) return null;

  if (content.type === "doc" && content.content) {
    return <>{content.content.map((c: PMNode, i: number) => <TransclusionContentRenderer key={i} content={c} />)}</>;
  }

  if (content.type === "paragraph") {
    return (
      <p className="mb-1 leading-relaxed">
        {content.content?.map((c: PMNode, i: number) => <TransclusionContentRenderer key={i} content={c} />)}
      </p>
    );
  }

  if (content.type === "text") {
    const textNode = content as PMTextNode;
    const text = textNode.text || "";
    if (content.marks) {
      let hasLink = false;
      let href = "";
      for (const mark of content.marks) {
        if (mark.type === "bold") return <strong key={text}>{text}</strong>;
        if (mark.type === "italic") return <em key={text}>{text}</em>;
        if (mark.type === "code") return <code key={text} className="bg-muted px-1 rounded text-xs">{text}</code>;
        if (mark.type === "strike") return <del key={text}>{text}</del>;
        if (mark.type === "link") { hasLink = true; href = (mark.attrs as { href?: string })?.href || ""; }
      }
      if (hasLink) {
        return <a key={text} href={href} className="text-primary underline">{text}</a>;
      }
    }
    return <>{text}</>;
  }

  if (content.type === "heading") {
    const level = (content.attrs as { level?: number })?.level || 1;
    const sizeClass = ["", "text-xl", "text-lg", "text-base"][level] || "text-base";
    const Tag = `h${level}` as React.ElementType;
    return (
      <Tag className={`${sizeClass} font-semibold mt-2 mb-1`}>
        {content.content?.map((c: PMNode, i: number) => <TransclusionContentRenderer key={i} content={c} />)}
      </Tag>
    );
  }

  if (content.type === "bulletList") {
    return (
      <ul className="list-disc pl-4 my-1">
        {content.content?.map((c: PMNode, i: number) => (
          <li key={i} className="mb-0.5">
            {c.content?.map((cc: PMNode, j: number) => <TransclusionContentRenderer key={j} content={cc} />)}
          </li>
        ))}
      </ul>
    );
  }

  if (content.type === "orderedList") {
    return (
      <ol className="list-decimal pl-4 my-1">
        {content.content?.map((c: PMNode, i: number) => (
          <li key={i} className="mb-0.5">
            {c.content?.map((cc: PMNode, j: number) => <TransclusionContentRenderer key={j} content={cc} />)}
          </li>
        ))}
      </ol>
    );
  }

  if (content.type === "codeBlock") {
    const text = content.content?.map((c: PMNode) => c.text || "").join("") || "";
    return (
      <pre className="bg-muted p-2 rounded text-xs overflow-x-auto my-1">
        <code>{text}</code>
      </pre>
    );
  }

  if (content.type === "blockquote") {
    return (
      <blockquote className="border-l-2 border-muted-foreground/20 pl-3 my-1 italic">
        {content.content?.map((c: PMNode, i: number) => <TransclusionContentRenderer key={i} content={c} />)}
      </blockquote>
    );
  }

  if (content.type === "horizontalRule") {
    return <hr className="my-2 border-border" />;
  }

  if (content.type === "image") {
    return <img src={(content.attrs as { src?: string })?.src || ""} alt={(content.attrs as { alt?: string })?.alt || ""} className="max-w-full h-auto rounded my-1" />;
  }

  if (content.type === "taskList") {
    return (
      <ul className="list-none pl-0 my-1">
        {content.content?.map((c: PMNode, i: number) => (
          <li key={i} className="flex items-start gap-2 mb-0.5">
            <input type="checkbox" checked={(c.attrs as { checked?: boolean })?.checked || false} disabled className="mt-1" />
            <span>{c.content?.map((cc: PMNode, j: number) => <TransclusionContentRenderer key={j} content={cc} />)}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Fallback: recurse into content
  if (content.content) {
    return <>{content.content.map((c: PMNode, i: number) => <TransclusionContentRenderer key={i} content={c} />)}</>;
  }

  return null;
}

export default Transclusion;
