import { Node, mergeAttributes } from "@tiptap/core";

export interface MentionOptions {
  HTMLAttributes: Record<string, any>;
  renderLabel: (props: { node: any }) => string;
  suggestion?: any;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mention: {
      insertMention: (attrs: { id: string; label: string }) => ReturnType;
    };
  }
}

export const Mention = Node.create<MentionOptions>({
  name: "mention",

  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel: ({ node }) => `@${node.attrs.label}`,
    };
  },

  addAttributes() {
    return {
      id: { default: null },
      label: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-mention]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes({ "data-mention": node.attrs.id, class: "mention" }, HTMLAttributes),
      `@${node.attrs.label}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label}`;
  },

  addCommands() {
    return {
      insertMention:
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
