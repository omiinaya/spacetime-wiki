// SPDX-License-Identifier: ISC

import type { Page } from "./types";
import { tableQuery } from "./client";
import { mapPage } from "./mappers";
import { getPage } from "./pages";

/**
 * Find a page by ID or slug. Tries ID first, then slug.
 */
async function resolvePageRef(ref: string): Promise<Page | null> {
  // Try as ID first
  const page = await getPage(ref);
  if (page) return page;
  // Try as slug
  try {
    const rows = await tableQuery(`SELECT * FROM page WHERE slug = '${ref}'`, mapPage);
    if (rows.length > 0) {
      return rows[0];
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Walk a ProseMirror JSON tree and replace all text nodes containing
 * `{{@page_id}}` or `{{@slug}}` patterns with transclusion nodes.
 *
 * The transclusion node has attrs: { pageId, pageTitle, content } where
 * `content` is the referenced page's ProseMirror content (parsed JSON).
 *
 * Handles:
 *   - `{{@page_id}}` — inline reference by page ID
 *   - `{{@slug}}` — inline reference by page slug
 *
 * Returns the resolved content tree (or the original if no transclusions found).
 */
export async function resolveTransclusions(doc: unknown): Promise<unknown> {
  if (!doc || typeof doc !== "object") return doc;
  const obj = doc as Record<string, unknown>;

  // TRANSCLUSION_REGEX matches {{@<identifier>}} where identifier is
  // alphanumeric plus underscore and hyphen (covers both IDs and slugs)
  const TRANS_RE = /{{@([a-zA-Z0-9_:-]+)}}/g;

  // Walk content array, looking for text nodes with transclusion patterns
  async function walkNode(node: unknown): Promise<unknown> {
    if (!node || typeof node !== "object") return node;
    const n = node as Record<string, unknown>;

    if (n.type === "text" && typeof n.text === "string") {
      const text = n.text as string;
      if (!text.includes("{{@")) return node; // fast path

      const parts: unknown[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      // Reset regex
      TRANS_RE.lastIndex = 0;

      while ((match = TRANS_RE.exec(text)) !== null) {
        // Push text before the match
        if (match.index > lastIndex) {
          const before = text.slice(lastIndex, match.index);
          if (before) {
            parts.push({ type: "text", text: before });
          }
        }

        const ref = match[1];
        // Fetch referenced page
        const referencedPage = await resolvePageRef(ref);
        if (referencedPage) {
          let parsedContent: unknown = null;
          try {
            parsedContent = JSON.parse(referencedPage.content || "{}");
          } catch {
            parsedContent = { type: "doc", content: [
              { type: "paragraph", content: [{ type: "text", text: `[Page "${referencedPage.title}" — content could not be parsed]` }] }
            ]};
          }

          parts.push({
            type: "transclusion",
            attrs: {
              pageId: referencedPage.id,
              pageTitle: referencedPage.title,
              content: parsedContent,
            },
          });
        } else {
          // Page not found — show a placeholder text
          parts.push({
            type: "text",
            text: `[Page not found: ${ref}]`,
          });
        }

        lastIndex = match.index + match[0].length;
      }

      // Push remaining text after the last match
      if (lastIndex < text.length) {
        const remaining = text.slice(lastIndex);
        if (remaining) {
          parts.push({ type: "text", text: remaining });
        }
      }

      if (parts.length === 0) return node;
      if (parts.length === 1) return parts[0];
      // Multiple parts — return a virtual paragraph wrapping all parts
      // (Tiptap doc model won't accept bare array where a single node is expected,
      //  but since this runs before editor.setContent, the parent walker handles it)
      return { type: "paragraph", content: parts };
    }

    // Recurse into content array
    if (Array.isArray(n.content)) {
      const resolvedContent: unknown[] = [];
      for (const child of n.content) {
        const resolved = await walkNode(child);
        if (Array.isArray(resolved)) {
          // If a text node resolved to multiple parts, spread them
          resolvedContent.push(...resolved);
        } else {
          resolvedContent.push(resolved);
        }
      }
      return { ...n, content: resolvedContent };
    }

    return node;
  }

  return walkNode(obj);
}
