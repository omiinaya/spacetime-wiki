import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
  types: { key: string; label: string; color: string; icon: string }[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (type?: string) => ReturnType;
      setCalloutType: (type: string) => ReturnType;
    };
  }
}

export const CALLOUT_TYPES = [
  { key: "info", label: "Info", color: "blue", icon: "ℹ️" },
  { key: "warning", label: "Warning", color: "amber", icon: "⚠️" },
  { key: "tip", label: "Tip", color: "emerald", icon: "💡" },
  { key: "danger", label: "Danger", color: "red", icon: "🚨" },
];

export const Callout = Node.create<CalloutOptions>({
  name: "callout",

  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      types: CALLOUT_TYPES,
    };
  },

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-callout-type") || "info",
        renderHTML: (attrs) => ({ "data-callout-type": attrs.type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout-type]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const calloutType = node.attrs.type || "info";
    const typeDef = CALLOUT_TYPES.find((t) => t.key === calloutType) || CALLOUT_TYPES[0];
    const colorMap: Record<string, string> = {
      blue: "border-blue-500/30 bg-blue-500/5",
      amber: "border-amber-500/30 bg-amber-500/5",
      emerald: "border-emerald-500/30 bg-emerald-500/5",
      red: "border-red-500/30 bg-red-500/5",
    };
    const borderClass = colorMap[typeDef.color] || colorMap.blue;

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: `callout my-3 p-3 rounded-lg border-l-4 ${borderClass}`,
        "data-callout-type": calloutType,
      }),
      [
        "div",
        { class: "flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wider select-none" },
        [
          "span",
          { class: "text-sm leading-none" },
          typeDef.icon,
        ],
        [
          "span",
          { class: `text-${typeDef.color}-400` },
          typeDef.label,
        ],
      ],
      [
        "div",
        { class: "callout-content prose prose-invert prose-sm max-w-none" },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      toggleCallout:
        (type) =>
        ({ commands }) => {
          return commands.toggleNode(this.name, "paragraph", { type: type || "info" });
        },
      setCalloutType:
        (type) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { type });
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
