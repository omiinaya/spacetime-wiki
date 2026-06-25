import { Heading } from "@tiptap/extension-heading";
import { mergeAttributes } from "@tiptap/core";

/**
 * Custom Heading extension that adds auto-generated `id` attributes to
 * heading elements (h1/h2/h3) for deep-linking via URL fragments.
 *
 * ID format: `h-{slugified-text}` — matches the format already used by
 * the Table of Contents extractor in PageView.tsx.
 */
export const HeadingWithId = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level || 1;
    const text = node.textContent || "";
    const slug = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const id = slug ? `h-${slug}` : undefined;

    return [
      `h${level}`,
      mergeAttributes(HTMLAttributes, { ...(id ? { id } : {}) }),
      0,
    ];
  },
});
