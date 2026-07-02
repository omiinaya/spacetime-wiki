import { Node, mergeAttributes } from "@tiptap/core";

// ─── Provider Types ──────────────────────────────────────────────────────────

export interface EmbedProvider {
  id: string;
  name: string;
  icon: string;
  /** Regex to match URLs for this provider */
  urlPattern: RegExp;
  /** Build the embed URL from the matched URL */
  embedUrl: (url: string) => string | null;
  /** If true, render as a responsive iframe (16:9) */
  iframe?: boolean;
  /** If true, render as a rich card with thumbnail/title */
  richCard?: boolean;
  /** Width/height for iframe embeds */
  width?: number;
  height?: number;
  /** Per-provider allow attribute for iframes */
  allow?: string;
}

// ─── 30+ Provider Registry ───────────────────────────────────────────────────

const EMBED_PROVIDERS: EmbedProvider[] = [
  // ── Video ──
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    urlPattern: /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    embedUrl: (url) => {
      const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return m ? `https://www.youtube.com/embed/${m[1]}` : null;
    },
    iframe: true,
    allow: "accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture",
  },
  {
    id: "vimeo",
    name: "Vimeo",
    icon: "🎥",
    urlPattern: /vimeo\.com\/(\d+)/,
    embedUrl: (url) => {
      const m = url.match(/vimeo\.com\/(\d+)/);
      return m ? `https://player.vimeo.com/video/${m[1]}` : null;
    },
    iframe: true,
    allow: "autoplay;fullscreen;picture-in-picture",
  },
  {
    id: "loom",
    name: "Loom",
    icon: "🎬",
    urlPattern: /loom\.com\/(?:share\/|embed\/)([a-f0-9]+)/,
    embedUrl: (url) => {
      const m = url.match(/loom\.com\/(?:share\/|embed\/)([a-f0-9]+)/);
      return m ? `https://www.loom.com/embed/${m[1]}` : null;
    },
    iframe: true,
  },
  {
    id: "twitch",
    name: "Twitch",
    icon: "📺",
    urlPattern: /twitch\.tv\/(?:videos\/)?(\d+|[a-zA-Z0-9_]+)/,
    embedUrl: (url) => {
      const m = url.match(/twitch\.tv\/(?:videos\/)?(\d+|[a-zA-Z0-9_]+)/);
      return m ? `https://player.twitch.tv/?video=${m[1]}&parent=localhost` : null;
    },
    iframe: true,
  },
  {
    id: "dailymotion",
    name: "Dailymotion",
    icon: "🎞️",
    urlPattern: /dailymotion\.com\/(?:video\/|embed\/)([a-zA-Z0-9]+)/,
    embedUrl: (url) => {
      const m = url.match(/dailymotion\.com\/(?:video\/|embed\/)([a-zA-Z0-9]+)/);
      return m ? `https://www.dailymotion.com/embed/video/${m[1]}` : null;
    },
    iframe: true,
  },

  // ── Presentation / Design ──
  {
    id: "figma",
    name: "Figma",
    icon: "🖌️",
    urlPattern: /figma\.com\/(?:file|proto)\/([a-zA-Z0-9]+)/,
    embedUrl: (url) => {
      const m = url.match(/figma\.com\/(?:file|proto)\/([a-zA-Z0-9]+)/);
      return m ? `https://www.figma.com/embed?embed_host=spacetime-wiki&url=${encodeURIComponent(url)}` : null;
    },
    iframe: true,
  },
  {
    id: "codepen",
    name: "CodePen",
    icon: "✏️",
    urlPattern: /codepen\.io\/(\w+)\/pen\/(\w+)/,
    embedUrl: (url) => {
      const m = url.match(/codepen\.io\/(\w+)\/pen\/(\w+)/);
      return m ? `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result` : null;
    },
    iframe: true,
  },
  {
    id: "codesandbox",
    name: "CodeSandbox",
    icon: "🛝",
    urlPattern: /codesandbox\.io\/(?:s\/|embed\/)([a-zA-Z0-9_-]+)/,
    embedUrl: (url) => {
      const m = url.match(/codesandbox\.io\/(?:s\/|embed\/)([a-zA-Z0-9_-]+)/);
      return m ? `https://codesandbox.io/embed/${m[1]}?fontsize=14&hidenavigation=1&theme=dark` : null;
    },
    iframe: true,
  },
  {
    id: "jsfiddle",
    name: "JSFiddle",
    icon: "🎻",
    urlPattern: /jsfiddle\.net\/(\w+)\/(\w+)/,
    embedUrl: (url) => {
      const m = url.match(/jsfiddle\.net\/(\w+)\/(\w+)/);
      return m ? `https://jsfiddle.net/${m[1]}/${m[2]}/embedded/` : null;
    },
    iframe: true,
  },
  {
    id: "replit",
    name: "Replit",
    icon: "🔄",
    urlPattern: /replit\.com\/@(\w+)\/(\w+)/,
    embedUrl: (url) => {
      const m = url.match(/replit\.com\/@(\w+)\/(\w+)/);
      return m ? `https://replit.com/@${m[1]}/${m[2]}?embed=true` : null;
    },
    iframe: true,
  },

  // ── Docs / Productivity ──
  {
    id: "googledocs",
    name: "Google Docs",
    icon: "📝",
    urlPattern: /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    embedUrl: (url) => {
      const m = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
      return m ? `https://docs.google.com/document/d/${m[1]}/preview` : null;
    },
    iframe: true,
  },
  {
    id: "googleslides",
    name: "Google Slides",
    icon: "📽️",
    urlPattern: /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    embedUrl: (url) => {
      const m = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
      return m ? `https://docs.google.com/presentation/d/${m[1]}/embed` : null;
    },
    iframe: true,
  },
  {
    id: "googlesheets",
    name: "Google Sheets",
    icon: "📊",
    urlPattern: /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    embedUrl: (url) => {
      const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      return m ? `https://docs.google.com/spreadsheets/d/${m[1]}/preview` : null;
    },
    iframe: true,
  },
  {
    id: "notion",
    name: "Notion",
    icon: "📋",
    urlPattern: /notion\.(?:so|site)\/(?:[a-zA-Z0-9_-]+\/)?([a-f0-9]+)/,
    embedUrl: (url) => {
      const m = url.match(/notion\.(?:so|site)\/(?:[a-zA-Z0-9_-]+\/)?([a-f0-9]+)/);
      return m ? `https://www.notion.so/embed/${m[1]}` : null;
    },
    richCard: true,
  },
  {
    id: "canva",
    name: "Canva",
    icon: "🎨",
    urlPattern: /canva\.com\/design\/([a-zA-Z0-9_-]+)/,
    embedUrl: (url) => {
      const m = url.match(/canva\.com\/design\/([a-zA-Z0-9_-]+)/);
      return m ? `https://www.canva.com/design/${m[1]}/view?embed` : null;
    },
    iframe: true,
  },
  {
    id: "miro",
    name: "Miro",
    icon: "🔵",
    urlPattern: /miro\.com\/app\/board\/([a-zA-Z0-9_-]+)/,
    embedUrl: (url) => {
      const m = url.match(/miro\.com\/app\/board\/([a-zA-Z0-9_-]+)/);
      return m ? `https://miro.com/app/live-embed/${m[1]}/` : null;
    },
    iframe: true,
  },
  {
    id: "excalidraw",
    name: "Excalidraw",
    icon: "✏️",
    urlPattern: /excalidraw\.com\/#?json=([a-zA-Z0-9_-]+)/,
    embedUrl: (url) => {
      const m = url.match(/excalidraw\.com\/#?json=([a-zA-Z0-9_-]+)/);
      return m ? `https://excalidraw.com/#json=${m[1]}` : null;
    },
    iframe: true,
  },

  // ── Developer / Code ──
  {
    id: "gist",
    name: "GitHub Gist",
    icon: "💡",
    urlPattern: /gist\.github\.com\/(\w+)\/([a-f0-9]+)/,
    embedUrl: (url) => {
      const m = url.match(/gist\.github\.com\/(\w+)\/([a-f0-9]+)/);
      return m ? `https://gist.github.com/${m[1]}/${m[2]}.js` : null;
    },
    richCard: true,
  },
  {
    id: "github",
    name: "GitHub",
    icon: "🐙",
    urlPattern: /github\.com\/([\w.-]+)\/([\w.-]+)/,
    embedUrl: () => null,
    richCard: true,
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: "🦊",
    urlPattern: /gitlab\.com\/([\w.-]+)\/([\w.-]+)/,
    embedUrl: () => null,
    richCard: true,
  },
  {
    id: "npm",
    name: "npm",
    icon: "📦",
    urlPattern: /npmjs\.com\/package\/([\w.-]+)/,
    embedUrl: (url) => null,
    richCard: true,
  },
  {
    id: "stackblitz",
    name: "StackBlitz",
    icon: "⚡",
    urlPattern: /stackblitz\.com\/(?:edit\/|github\/)?([\w.-]+)/,
    embedUrl: (url) => {
      const m = url.match(/stackblitz\.com\/(?:edit\/|github\/)?([\w.-]+)/);
      return m ? `https://stackblitz.com/edit/${m[1]}?embed=1&file=index.tsx&theme=dark` : null;
    },
    iframe: true,
  },

  // ── Social / Embed ──
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: "🐦",
    urlPattern: /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
    embedUrl: () => null,
    richCard: true,
  },
  {
    id: "bluesky",
    name: "Bluesky",
    icon: "🦋",
    urlPattern: /bsky\.app\/profile\/([\w.]+)\/post\/([\w]+)/,
    embedUrl: () => null,
    richCard: true,
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: "👽",
    urlPattern: /reddit\.com\/r\/\w+\/comments\/(\w+)/,
    embedUrl: (url) => {
      const m = url.match(/reddit\.com\/r\/\w+\/comments\/(\w+)/);
      return m ? `https://www.redditmedia.com/${url.match(/reddit\.com(\/.+)/)?.[1]}?ref=share&ref_source=embed` : null;
    },
    iframe: true,
  },

  // ── Maps / Geo ──
  {
    id: "googlemaps",
    name: "Google Maps",
    icon: "🗺️",
    urlPattern: /google\.com\/maps\/embed\?pb=([!a-zA-Z0-9!]+)/,
    embedUrl: (url) => url,
    iframe: true,
  },
  {
    id: "openstreetmap",
    name: "OpenStreetMap",
    icon: "🌍",
    urlPattern: /openstreetmap\.org\/#map=(\d+\/[\d.-]+\/[\d.-]+)/,
    embedUrl: (url) => {
      const m = url.match(/#map=(\d+\/[\d.-]+\/[\d.-]+)/);
      return m ? `https://www.openstreetmap.org/export/embed.html?bbox=${m[1]}&layer=mapnik` : null;
    },
    iframe: true,
  },

  // ── Audio ──
  {
    id: "spotify",
    name: "Spotify",
    icon: "🎵",
    urlPattern: /(?:open\.spotify\.com\/(?:track|album|playlist|episode|show)\/([a-zA-Z0-9]+))/,
    embedUrl: (url) => {
      const m = url.match(/(?:open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+))/);
      return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
    },
    iframe: true,
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    icon: "🎧",
    urlPattern: /soundcloud\.com\/([\w-]+)\/([\w-]+)/,
    embedUrl: () => null,
    richCard: true,
  },
  {
    id: "applepodcasts",
    name: "Apple Podcasts",
    icon: "🎙️",
    urlPattern: /podcasts\.apple\.com\/(\w+)\/podcast\/([\w-]+)\/id(\d+)/,
    embedUrl: (url) => {
      const m = url.match(/id(\d+)/);
      return m ? `https://embed.podcasts.apple.com/us/podcast/id${m[1]}` : null;
    },
    iframe: true,
  },
];

// ─── Deduplicate ─────────────────────────────────────────────────────────────

const UNIQUE_PROVIDERS: EmbedProvider[] = (() => {
  const seen = new Set<string>();
  return EMBED_PROVIDERS.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
})();

// ─── Detection ───────────────────────────────────────────────────────────────

export function detectEmbedProvider(url: string): EmbedProvider | null {
  for (const provider of UNIQUE_PROVIDERS) {
    if (provider.urlPattern.test(url)) return provider;
  }
  return null;
}

export function buildEmbedUrl(url: string): { provider: EmbedProvider; embedSrc: string | null } | null {
  for (const provider of UNIQUE_PROVIDERS) {
    const embedSrc = provider.embedUrl(url);
    if (embedSrc || provider.richCard) {
      return { provider, embedSrc };
    }
  }
  return null;
}

export function getAllProviders(): EmbedProvider[] {
  return UNIQUE_PROVIDERS;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface RichEmbedOptions {
  HTMLAttributes: Record<string, any>;
  width: number;
  height: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    richEmbed: {
      setRichEmbed: (options: { src: string; provider?: string; embedSrc?: string }) => ReturnType;
    };
  }
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const RichEmbed = Node.create<RichEmbedOptions>({
  name: "richEmbed",

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
      title: { default: null },
      width: { default: this.options.width },
      height: { default: this.options.height },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-rich-embed]",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { embedSrc, width, height, provider, src, title } = node.attrs;
    const providerInfo = UNIQUE_PROVIDERS.find((p) => p.id === provider);
    const providerName = providerInfo?.name || provider || "Embed";
    const providerIcon = providerInfo?.icon || "🔗";

    // Rich card embeds (no iframe — show a link card)
    if (providerInfo?.richCard || !embedSrc) {
      return [
        "div",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          "data-rich-embed": "",
          "data-provider": provider,
          class: "rich-embed-card my-4 rounded-lg border border-border bg-[#0a0a0a] overflow-hidden",
        }),
        [
          "a",
          {
            href: src,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "block p-4 hover:bg-muted/20 transition-colors no-underline",
          },
          [
            "div",
            { class: "flex items-center gap-2 mb-1" },
            ["span", { class: "text-base" }, providerIcon],
            ["span", { class: "text-xs font-semibold uppercase tracking-wider text-muted-foreground" }, providerName],
          ],
          [
            "div",
            { class: "text-sm font-medium text-[hsl(var(--foreground))]" },
            title || src || "Open link",
          ],
          [
            "div",
            { class: "text-xs text-muted-foreground mt-1 truncate" },
            src,
          ],
        ],
      ];
    }

    // Iframe embed
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-rich-embed": "",
        "data-provider": provider,
        class: "rich-embed-iframe my-4 rounded-lg overflow-hidden border border-border bg-[#0a0a0a]",
      }),
      [
        "div",
        {
          class: "flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        },
        ["span", { class: "text-xs" }, providerIcon],
        ["span", {}, providerName],
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
            allow: providerInfo?.allow || "autoplay;fullscreen",
            referrerpolicy: "strict-origin-when-cross-origin",
          },
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setRichEmbed:
        (options) =>
        ({ commands }) => {
          const attrs: Record<string, any> = { ...options };
          if (!options.provider && options.src) {
            const info = buildEmbedUrl(options.src);
            if (info) {
              attrs.provider = info.provider.id;
              attrs.embedSrc = info.embedSrc;
              // Derive a title from the URL for display
              attrs.title = options.src;
              if (!info.provider.richCard && info.embedSrc) {
                attrs.embedSrc = info.embedSrc;
              }
            } else {
              attrs.embedSrc = options.src;
              attrs.provider = "unknown";
              attrs.title = options.src;
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

