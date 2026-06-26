import { Node, mergeAttributes } from "@tiptap/core";

// ─── Provider definitions ─────────────────────────────────────────────────────

export interface VideoProvider {
  id: string;
  name: string;
  icon: string;
  /** Regex to match the provider's URL patterns */
  urlPattern: RegExp;
  /** Extract video ID from a matched URL */
  extractId: (url: string) => string | null;
  /** Build embed URL from video ID */
  embedUrl: (id: string, attrs?: Record<string, any>) => string;
  /** If true, the embed uses an iframe with allowFullScreen */
  allowFullScreen?: boolean;
}

const PROVIDERS: VideoProvider[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶",
    // youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
    urlPattern: /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    extractId: (url) => {
      const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
    },
    embedUrl: (id) => `https://www.youtube.com/embed/${id}`,
    allowFullScreen: true,
  },
  {
    id: "vimeo",
    name: "Vimeo",
    icon: "🎥",
    urlPattern: /vimeo\.com\/(\d+)/,
    extractId: (url) => {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? match[1] : null;
    },
    embedUrl: (id) => `https://player.vimeo.com/video/${id}`,
    allowFullScreen: true,
  },
  {
    id: "loom",
    name: "Loom",
    icon: "🎬",
    urlPattern: /loom\.com\/(?:share\/|embed\/)([a-f0-9]+)/,
    extractId: (url) => {
      const match = url.match(/loom\.com\/(?:share\/|embed\/)([a-f0-9]+)/);
      return match ? match[1] : null;
    },
    embedUrl: (id) => `https://www.loom.com/embed/${id}`,
    allowFullScreen: true,
  },
  {
    id: "twitch",
    name: "Twitch",
    icon: "📺",
    urlPattern: /twitch\.tv\/(?:videos\/)?(\d+|[a-zA-Z0-9_]+)/,
    extractId: (url) => {
      // Twitch can be clips, videos, or channels
      const match = url.match(/twitch\.tv\/(?:videos\/)?(\d+|[a-zA-Z0-9_]+)/);
      return match ? match[1] : null;
    },
    embedUrl: (id) => `https://player.twitch.tv/?video=${id}&parent=localhost`,
    allowFullScreen: true,
  },
  {
    id: "vimeo",
    name: "Vimeo",
    icon: "🎥",
    urlPattern: /vimeo\.com\/(\d+)/,
    extractId: (url) => {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? match[1] : null;
    },
    embedUrl: (id) => `https://player.vimeo.com/video/${id}`,
    allowFullScreen: true,
  },
];

// Remove duplicate Vimeo entry — keep it clean
const UNIQUE_PROVIDERS: VideoProvider[] = (() => {
  const seen = new Set<string>();
  return PROVIDERS.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
})();

export function detectProvider(url: string): VideoProvider | null {
  for (const provider of UNIQUE_PROVIDERS) {
    if (provider.urlPattern.test(url)) {
      return provider;
    }
  }
  return null;
}

export function buildEmbedUrl(url: string): { provider: VideoProvider; embedSrc: string } | null {
  for (const provider of UNIQUE_PROVIDERS) {
    const id = provider.extractId(url);
    if (id) {
      return { provider, embedSrc: provider.embedUrl(id) };
    }
  }
  return null;
}

// ─── Options ───────────────────────────────────────────────────────────────────

export interface VideoEmbedOptions {
  HTMLAttributes: Record<string, any>;
  width: number;
  height: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (options: { src: string; provider?: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

// ─── Extension ─────────────────────────────────────────────────────────────────

export const VideoEmbed = Node.create<VideoEmbedOptions>({
  name: "videoEmbed",

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
      provider: { default: null },
      embedSrc: { default: null },
      width: { default: this.options.width },
      height: { default: this.options.height },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-video-embed]",
      },
      {
        tag: "iframe[src*='youtube.com']",
        getAttrs: (el) => {
          const iframe = el as HTMLIFrameElement;
          const src = iframe.src;
          const info = buildEmbedUrl(src);
          if (info) {
            return { src, provider: info.provider.id, embedSrc: src };
          }
          return false;
        },
      },
      {
        tag: "iframe[src*='vimeo.com']",
        getAttrs: (el) => {
          const iframe = el as HTMLIFrameElement;
          const src = iframe.src;
          const info = buildEmbedUrl(src);
          if (info) {
            return { src, provider: info.provider.id, embedSrc: src };
          }
          return false;
        },
      },
      {
        tag: "iframe[src*='loom.com']",
        getAttrs: (el) => {
          const iframe = el as HTMLIFrameElement;
          const src = iframe.src;
          const info = buildEmbedUrl(src);
          if (info) {
            return { src, provider: info.provider.id, embedSrc: src };
          }
          return false;
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { embedSrc, width, height, provider } = node.attrs;
    const providerName = provider || "video";
    const providerIcon = UNIQUE_PROVIDERS.find((p) => p.id === provider)?.icon || "🎬";

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-video-embed": "",
        "data-provider": provider,
        class: "video-embed-block my-4 rounded-lg overflow-hidden border border-border bg-[#0a0a0a]",
        style: "position:relative;",
      }),
      [
        "div",
        {
          class: "flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        },
        [
          "span",
          { class: "text-xs" },
          providerIcon,
        ],
        [
          "span",
          {},
          providerName,
        ],
      ],
      [
        "div",
        {
          style: "position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;background:#000;",
        },
        [
          "iframe",
          {
            src: embedSrc,
            width: width,
            height: height,
            style: "position:absolute;top:0;left:0;width:100%;height:100%;border:0;",
            allowfullscreen: provider !== "vimeo" ? "" : undefined,
            allow:
              provider === "youtube"
                ? "accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                : provider === "vimeo"
                  ? "autoplay;fullscreen;picture-in-picture"
                  : "autoplay;fullscreen",
            referrerpolicy: "strict-origin-when-cross-origin",
          },
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        (options) =>
        ({ commands }) => {
          // Auto-detect provider if not specified
          let attrs: Record<string, any> = { ...options };
          if (!options.provider && options.src) {
            const info = buildEmbedUrl(options.src);
            if (info) {
              attrs.provider = info.provider.id;
              attrs.embedSrc = info.embedSrc;
            } else {
              // Fallback: use the src directly as embed src
              attrs.embedSrc = options.src;
              attrs.provider = "unknown";
            }
          }
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
