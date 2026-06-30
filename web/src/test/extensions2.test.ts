import { describe, it, expect, beforeAll } from "vitest";

function createContext(node: any) {
  const opts = node.config.addOptions?.() ?? {};
  return {
    options: opts,
    name: node.name,
    storage: {},
    parent: undefined,
  };
}

function getAttrs(node: any) {
  const ctx = createContext(node);
  return node.config.addAttributes?.call(ctx) ?? {};
}

function getParseRules(node: any): any[] {
  const ctx = createContext(node);
  return node.config.parseHTML?.call(ctx) ?? [];
}

function getRenderHTML(node: any, props: any): any {
  const ctx = createContext(node);
  return node.config.renderHTML?.call(ctx, props) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mermaid
// ═══════════════════════════════════════════════════════════════════════════════

import { Mermaid } from "../extensions/Mermaid";

describe("Mermaid Node", () => {
  const node = Mermaid as any;

  it("has name 'mermaid'", () => {
    expect(node.name).toBe("mermaid");
  });

  it("config has group, atom, selectable, draggable", () => {
    expect(node.config.group).toBe("block");
    expect(node.config.atom).toBe(true);
    expect(node.config.selectable).toBe(true);
    expect(node.config.draggable).toBe(true);
  });

  it("src attribute default is a sample graph", () => {
    const attrs = getAttrs(node);
    expect(attrs.src.default).toContain("graph TD");
  });

  it("parses from div[data-mermaid-src] and div.mermaid", () => {
    const rules = getParseRules(node);
    expect(rules).toHaveLength(2);
    expect(rules[0].tag).toBe("div[data-mermaid-src]");
    expect(rules[1].tag).toBe("div.mermaid");
  });

  it("renders HTML with mermaid-wrapper class", () => {
    const html = getRenderHTML(node, { node: { attrs: { src: "graph TD\n  A-->B" } }, HTMLAttributes: {} });
    expect(html).toBeDefined();
    const [tag, attrs, content] = html;
    expect(tag).toBe("div");
    expect(attrs).toMatchObject({ "data-mermaid-src": "graph TD\n  A-->B" });
    expect(attrs.class).toContain("mermaid-wrapper");
    expect(content).toBe("graph TD\n  A-->B");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Math — Inline & Block
// ═══════════════════════════════════════════════════════════════════════════════

import { MathInline, MathBlock } from "../extensions/Math";

describe("MathInline Node", () => {
  const node = MathInline as any;

  it("has name 'mathInline'", () => {
    expect(node.name).toBe("mathInline");
  });

  it("is inline, atom", () => {
    expect(node.config.group).toBe("inline");
    expect(node.config.inline).toBe(true);
    expect(node.config.atom).toBe(true);
  });

  it("tex attribute has empty default", () => {
    const attrs = getAttrs(node);
    expect(attrs.tex.default).toBe("");
  });

  it("parses from span[data-math-inline]", () => {
    const rules = getParseRules(node);
    expect(rules).toEqual([{ tag: "span[data-math-inline]" }]);
  });

  it("renders HTML with data-math-inline", () => {
    const html = getRenderHTML(node, { node: { attrs: { tex: "E=mc^2" } }, HTMLAttributes: {} });
    const [tag, attrs] = html;
    expect(tag).toBe("span");
    expect(attrs).toMatchObject({ "data-math-inline": "" });
    expect(attrs.class).toContain("math-inline");
  });
});

describe("MathBlock Node", () => {
  const node = MathBlock as any;

  it("has name 'mathBlock'", () => {
    expect(node.name).toBe("mathBlock");
  });

  it("is block, atom, draggable, defining", () => {
    expect(node.config.group).toBe("block");
    expect(node.config.atom).toBe(true);
    expect(node.config.draggable).toBe(true);
    expect(node.config.defining).toBe(true);
  });

  it("tex attribute default is E=mc^2", () => {
    const attrs = getAttrs(node);
    expect(attrs.tex.default).toBe("E = mc^2");
  });

  it("parses from div[data-math-block] and div.math-block", () => {
    const rules = getParseRules(node);
    expect(rules).toHaveLength(2);
    expect(rules[0].tag).toBe("div[data-math-block]");
    expect(rules[1].tag).toBe("div.math-block");
  });

  it("renders HTML with math-block class", () => {
    const html = getRenderHTML(node, { node: { attrs: { tex: "E=mc^2" } }, HTMLAttributes: {} });
    const [tag, attrs] = html;
    expect(tag).toBe("div");
    expect(attrs).toMatchObject({ "data-math-block": "" });
    expect(attrs.class).toContain("math-block");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Transclusion
// ═══════════════════════════════════════════════════════════════════════════════

import { Transclusion } from "../extensions/Transclusion";

describe("Transclusion Node", () => {
  const node = Transclusion as any;
  let rules: any[];

  beforeAll(() => { rules = getParseRules(node); });

  it("has name 'transclusion'", () => {
    expect(node.name).toBe("transclusion");
  });

  it("is block, atom, defining", () => {
    expect(node.config.group).toBe("block");
    expect(node.config.atom).toBe(true);
    expect(node.config.defining).toBe(true);
  });

  it("has pageId, pageTitle, content attributes", () => {
    const attrs = getAttrs(node);
    expect(attrs.pageId.default).toBe("");
    expect(attrs.pageTitle.default).toBe("");
    expect(attrs.content.default).toBeNull();
  });

  it("parses from div[data-transclusion]", () => {
    expect(rules).toHaveLength(1);
    expect(rules[0].tag).toBe("div[data-transclusion]");
  });

  it("getAttrs extracts pageId and pageTitle from element", () => {
    const el = document.createElement("div");
    el.setAttribute("data-transclusion-page-id", "page123");
    el.setAttribute("data-transclusion-page-title", "Test Page");
    const attrs = rules[0].getAttrs(el);
    expect(attrs).toEqual({ pageId: "page123", pageTitle: "Test Page" });
  });

  it("renders HTML with transclusion attributes", () => {
    const html = getRenderHTML(node, { node: { attrs: { pageId: "p1", pageTitle: "My Page", content: null } }, HTMLAttributes: {} });
    const [tag, attrs] = html;
    expect(tag).toBe("div");
    expect(attrs).toMatchObject({
      "data-transclusion": "",
      "data-transclusion-page-id": "p1",
      "data-transclusion-page-title": "My Page",
    });
    expect(attrs.class).toContain("transclusion-block");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SyncedBlock
// ═══════════════════════════════════════════════════════════════════════════════

import { SyncedBlockExtension } from "../extensions/SyncedBlock";

describe("SyncedBlock Node", () => {
  const node = SyncedBlockExtension as any;
  let rules: any[];

  beforeAll(() => { rules = getParseRules(node); });

  it("has name 'syncedBlock'", () => {
    expect(node.name).toBe("syncedBlock");
  });

  it("is block, atom, defining", () => {
    expect(node.config.group).toBe("block");
    expect(node.config.atom).toBe(true);
    expect(node.config.defining).toBe(true);
  });

  it("has blockId, blockTitle, content attributes", () => {
    const attrs = getAttrs(node);
    expect(attrs.blockId.default).toBe("");
    expect(attrs.blockTitle.default).toBe("");
    expect(attrs.content.default).toBeNull();
  });

  it("parses from div[data-synced-block]", () => {
    expect(rules).toHaveLength(1);
    expect(rules[0].tag).toBe("div[data-synced-block]");
  });

  it("getAttrs extracts blockId and blockTitle", () => {
    const el = document.createElement("div");
    el.setAttribute("data-synced-block-id", "b42");
    el.setAttribute("data-synced-block-title", "Shared");
    const attrs = rules[0].getAttrs(el);
    expect(attrs).toEqual({ blockId: "b42", blockTitle: "Shared" });
  });

  it("renders HTML with synced-block attributes", () => {
    const html = getRenderHTML(node, { node: { attrs: { blockId: "b1", blockTitle: "Notes", content: null } }, HTMLAttributes: {} });
    const [tag, attrs] = html;
    expect(tag).toBe("div");
    expect(attrs).toMatchObject({
      "data-synced-block": "",
      "data-synced-block-id": "b1",
      "data-synced-block-title": "Notes",
    });
    expect(attrs.class).toContain("synced-block");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DatabaseBase
// ═══════════════════════════════════════════════════════════════════════════════

import { DatabaseBase } from "../extensions/DatabaseBase";

describe("DatabaseBase Node", () => {
  const node = DatabaseBase as any;

  it("has name 'databaseBase'", () => {
    expect(node.name).toBe("databaseBase");
  });

  it("is block, atom, draggable", () => {
    expect(node.config.group).toBe("block");
    expect(node.config.atom).toBe(true);
    expect(node.config.draggable).toBe(true);
  });

  it("baseId attribute default is empty string", () => {
    const attrs = getAttrs(node);
    expect(attrs.baseId.default).toBe("");
  });

  it("parses from div[data-base-id]", () => {
    const rules = getParseRules(node);
    expect(rules).toEqual([{ tag: "div[data-base-id]" }]);
  });

  it("renders HTML", () => {
    const html = getRenderHTML(node, { node: { attrs: { baseId: "base1" } }, HTMLAttributes: {} });
    expect(html).toBeDefined();
    const [tag] = html;
    expect(tag).toBe("div");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ImageEnhanced
// ═══════════════════════════════════════════════════════════════════════════════

import { ImageEnhanced } from "../extensions/ImageEnhanced";

describe("ImageEnhanced Node", () => {
  const node = ImageEnhanced as any;

  it("has name 'imageEnhanced'", () => {
    expect(node.name).toBe("imageEnhanced");
  });

  it("is block, atom, draggable, selectable", () => {
    expect(node.config.group).toBe("block");
    expect(node.config.atom).toBe(true);
    expect(node.config.draggable).toBe(true);
    expect(node.config.selectable).toBe(true);
  });

  it("has src, alt, title, width, align, caption attributes", () => {
    const attrs = getAttrs(node);
    expect(attrs.src.default).toBeNull();
    expect(attrs.alt.default).toBeNull();
    expect(attrs.title.default).toBeNull();
    expect(attrs.width.default).toBeNull();
    expect(attrs.align.default).toBe("center");
    expect(attrs.caption.default).toBe("");
  });

  it("renders HTML as div wrapper with image inside", () => {
    const html = getRenderHTML(node, { node: { attrs: { src: "img.png", alt: "pic", title: null, width: null, align: "center", caption: "" } }, HTMLAttributes: {} });
    const [tag, attrs] = html;
    expect(tag).toBe("div");
    expect(attrs.class).toContain("image-wrapper");
    expect(attrs["data-image-enhanced"]).toBe("true");
    // children = html[2] = [["div", innerAttrs, ["img", imgAttrs]]]
    const innerDiv = html[2]?.[0];
    expect(innerDiv?.[0]).toBe("div");
    const img = innerDiv?.[2];
    expect(img?.[0]).toBe("img");
    expect(img?.[1]).toMatchObject({ src: "img.png", alt: "pic" });
  });

  it("includes data-image-enhanced attribute on wrapper", () => {
    const html = getRenderHTML(node, { node: { attrs: { src: "x.png", alt: null, title: null, width: null, align: "center", caption: "" } }, HTMLAttributes: {} });
    const [, attrs] = html;
    expect(attrs["data-image-enhanced"]).toBe("true");
  });

  it("sets width on the inner img element", () => {
    const html = getRenderHTML(node, { node: { attrs: { src: "x.png", alt: null, title: null, width: "50%", align: "center", caption: "" } }, HTMLAttributes: {} });
    const img = html[2]?.[0]?.[2];
    expect(img?.[1]?.style).toContain("width:50%");
  });

  it("defaults width to 100% when not provided", () => {
    const html = getRenderHTML(node, { node: { attrs: { src: "x.png", alt: null, title: null, width: null, align: "center", caption: "" } }, HTMLAttributes: {} });
    const img = html[2]?.[0]?.[2];
    expect(img?.[1]?.style).toContain("width:100%");
  });

  it("includes figcaption when caption is provided", () => {
    const html = getRenderHTML(node, { node: { attrs: { src: "x.png", alt: null, title: null, width: null, align: "center", caption: "My caption" } }, HTMLAttributes: {} });
    // caption is inside children array at html[2][1]
    const caption = html[2]?.[1];
    expect(caption?.[0]).toBe("p");
    expect(caption?.[1]?.class).toContain("image-caption");
    expect(caption?.[2]).toBe("My caption");
  });
});
