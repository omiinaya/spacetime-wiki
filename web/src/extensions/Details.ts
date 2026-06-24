import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";

export interface DetailsOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    details: {
      toggleDetails: () => ReturnType;
    };
  }
}

export const Details = Node.create<DetailsOptions>({
  name: "details",

  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "my-2 rounded-lg border border-border bg-muted/30",
      }),
      [
        "summary",
        { class: "px-3 py-1.5 cursor-pointer select-none text-sm font-medium text-muted-foreground hover:text-foreground" },
        0, // placeholder; user edits content
      ],
      ["div", { class: "px-3 pb-2" }, 0],
    ];
  },

  addCommands() {
    return {
      toggleDetails:
        () =>
        ({ commands }) => {
          return commands.toggleNode("details", "paragraph");
        },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^:::(\s|$)/,
        type: this.type,
      }),
    ];
  },
});
