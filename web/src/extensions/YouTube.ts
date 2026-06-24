import { Node, mergeAttributes } from "@tiptap/core";

export interface YouTubeOptions {
  HTMLAttributes: Record<string, any>;
  width: number;
  height: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    youtube: {
      setYouTube: (options: { src: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

export const YouTube = Node.create<YouTubeOptions>({
  name: "youtube",

  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      width: 640,
      height: 360,
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      width: { default: this.options.width },
      height: { default: this.options.height },
    };
  },

  parseHTML() {
    return [
      { tag: "div[data-youtube-video]" },
      { tag: "iframe[src*='youtube.com']" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, width, height } = HTMLAttributes;
    return [
      "div",
      { "data-youtube-video": "", class: "youtube-embed", style: "position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;background:#000;border-radius:8px;margin:12px 0" },
      ["iframe", { src, width, height, style: "position:absolute;top:0;left:0;width:100%;height:100%;border:0", allowfullscreen: "", allow: "accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" }],
    ];
  },

  addCommands() {
    return {
      setYouTube:
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
