import { api } from "./api";
import type { PMNode, PMTextNode, PMDoc, PMBlockNode } from "./prosemirror-types";

export async function callReducerLocal(reducer: string, args: unknown[]) {
  const DB_ID = "c20000000000000000000000000000000000000000000000000000000000000000";
  await fetch(`http://127.0.0.1:3001/v1/database/${DB_ID}/call/${reducer}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(args),
  });
}

/** Extract inline content from an HTML element, producing ProseMirror inline nodes */
export function extractInlineContent(el: HTMLElement): PMNode[] {
  const content: PMNode[] = [];
  for (const child of el.childNodes) {
    if (child.nodeType === 3) {
      const t = (child.textContent || "").trim();
      if (t) content.push({ type: "text", text: t });
    } else {
      const c = child as HTMLElement;
      const tag = c.tagName?.toLowerCase();
      if (tag === "strong" || tag === "b") {
        content.push({ type: "text", text: c.textContent || "", marks: [{ type: "bold" }] });
      } else if (tag === "em" || tag === "i") {
        content.push({ type: "text", text: c.textContent || "", marks: [{ type: "italic" }] });
      } else if (tag === "u") {
        content.push({ type: "text", text: c.textContent || "", marks: [{ type: "underline" }] });
      } else if (tag === "s" || tag === "del") {
        content.push({ type: "text", text: c.textContent || "", marks: [{ type: "strike" }] });
      } else if (tag === "code") {
        content.push({ type: "text", text: c.textContent || "", marks: [{ type: "code" }] });
      } else if (tag === "a") {
        content.push({ type: "text", text: c.textContent || "", marks: [{ type: "link", attrs: { href: c.getAttribute("href") || "" } }] });
      } else if (tag === "br") {
        content.push({ type: "text", text: " " });
      } else {
        const t = c.textContent?.trim();
        if (t) content.push({ type: "text", text: t });
      }
    }
  }
  return content;
}

export function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Convert simple HTML (Notion HTML export) to ProseMirror JSON */
export function htmlToProseMirror(html: string): PMDoc {
  const doc: PMDoc = { type: "doc", content: [] };
  const div = document.createElement("div");
  div.innerHTML = html;
  for (const node of div.childNodes) {
    if (node.nodeType === 3) {
      const t = (node.textContent || "").trim();
      if (t) doc.content.push({ type: "paragraph", content: [{ type: "text", text: t }] });
      continue;
    }
    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();
    if (!tag) continue;
    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
      const level = parseInt(tag[1]);
      doc.content.push({ type: "heading", attrs: { level }, content: [{ type: "text", text: el.textContent || "" }] });
    } else if (tag === "p") {
      doc.content.push({ type: "paragraph", content: extractInlineContent(el) });
    } else if (tag === "ul" || tag === "ol") {
      const items: PMNode[] = [];
      el.querySelectorAll(":scope > li").forEach((li) => {
        items.push({ type: "listItem", content: [{ type: "paragraph", content: extractInlineContent(li as HTMLElement) }] });
      });
      doc.content.push({ type: tag === "ul" ? "bulletList" : "orderedList", content: items });
    } else if (tag === "blockquote") {
      doc.content.push({ type: "blockquote", content: [{ type: "paragraph", content: extractInlineContent(el) }] });
    } else if (tag === "pre") {
      const code = el.querySelector("code");
      const text = code?.textContent || el.textContent || "";
      doc.content.push({ type: "codeBlock", content: [{ type: "text", text }] });
    } else if (tag === "hr") {
      doc.content.push({ type: "horizontalRule" });
    } else if (tag === "figure") {
      const img = el.querySelector("img");
      if (img) {
        doc.content.push({ type: "image", attrs: { src: img.getAttribute("src") || "", alt: img.getAttribute("alt") || "" } });
      }
    } else if (tag === "table") {
      const rows: PMNode[] = [];
      el.querySelectorAll(":scope > tr, :scope > thead > tr, :scope > tbody > tr").forEach((tr) => {
        const cells: PMNode[] = [];
        const trEl = tr as HTMLElement;
        trEl.querySelectorAll("th, td").forEach((td) => {
          const tdEl = td as HTMLElement;
          const isHeader = tdEl.tagName === "TH";
          cells.push({ type: isHeader ? "tableHeader" : "tableCell", content: [{ type: "paragraph", content: extractInlineContent(tdEl) }] });
        });
        rows.push({ type: "tableRow", content: cells });
      });
      if (rows.length) doc.content.push({ type: "table", content: rows });
    } else {
      const text = el.textContent?.trim();
      if (text) doc.content.push({ type: "paragraph", content: [{ type: "text", text }] });
    }
  }
  if (doc.content.length === 0) doc.content.push({ type: "paragraph", content: [] });
  return doc;
}

export function markdownToProseMirror(md: string): PMDoc {
  const doc: PMDoc = { type: "doc", content: [] };
  const lines = md.split("\n");
  let i = 0;
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];

  function addParagraph(text: string) {
    if (!text.trim()) return;
    const content: PMNode[] = [];
    const parts = text.split(/(\*\*.*?\*\*|_.*?_|`.*?`|~~.*?~~|\[.*?\]\(.*?\))/g);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("**") && part.endsWith("**")) {
        content.push({ type: "text", text: part.slice(2, -2), marks: [{ type: "bold" }] });
      } else if (part.startsWith("_") && part.endsWith("_")) {
        content.push({ type: "text", text: part.slice(1, -1), marks: [{ type: "italic" }] });
      } else if (part.startsWith("`") && part.endsWith("`")) {
        content.push({ type: "text", text: part.slice(1, -1), marks: [{ type: "code" }] });
      } else if (part.startsWith("~~") && part.endsWith("~~")) {
        content.push({ type: "text", text: part.slice(2, -2), marks: [{ type: "strike" }] });
      } else if (part.startsWith("[") && part.includes("](")) {
        const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
          content.push({ type: "text", text: match[1], marks: [{ type: "link", attrs: { href: match[2] } }] });
        } else {
          content.push({ type: "text", text: part });
        }
      } else {
        content.push({ type: "text", text: part });
      }
    }
    if (content.length > 0) {
      doc.content.push({ type: "paragraph", content });
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (inCodeBlock) {
      if (line.startsWith("```")) {
        doc.content.push({ type: "codeBlock", attrs: { language: codeLang }, content: [{ type: "text", text: codeLines.join("\n") }] });
        codeLines = [];
        codeLang = "";
        inCodeBlock = false;
        i++;
        continue;
      }
      codeLines.push(line);
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      inCodeBlock = true;
      codeLang = line.slice(3).trim();
      i++;
      continue;
    }

    if (!line.trim()) { i++; continue; }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      doc.content.push({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
      i++;
      continue;
    }

    if (/^---+$/.test(line)) {
      doc.content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const text = line.slice(2);
      doc.content.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
      i++;
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: PMNode[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*+]\s+/, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }] });
        i++;
      }
      doc.content.push({ type: "bulletList", content: items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: PMNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }] });
        i++;
      }
      doc.content.push({ type: "orderedList", content: items });
      continue;
    }

    if (/^\s*[-*+]\s+[[ x]\]\]\s+/i.test(line)) {
      const items: PMNode[] = [];
      while (i < lines.length && /^\s*[-*+]\s+[[ x]\]\]\s+/i.test(lines[i])) {
        const checked = lines[i].includes("[x]") || lines[i].includes("[X]");
        const text = lines[i].replace(/^\s*[-*+]\s+[[ x]\]\]\s+/i, "");
        items.push({ type: "taskItem", attrs: { checked }, content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
        i++;
      }
      doc.content.push({ type: "taskList", content: items });
      continue;
    }

    addParagraph(line);
    i++;
  }

  if (inCodeBlock && codeLines.length > 0) {
    doc.content.push({ type: "codeBlock", attrs: { language: codeLang }, content: [{ type: "text", text: codeLines.join("\n") }] });
  }

  if (doc.content.length === 0) {
    doc.content.push({ type: "paragraph", content: [] });
  }
  return doc;
}

export function tiptapToMarkdown(doc: PMNode): string {
  const lines: string[] = [];
  function walk(node: PMNode, depth = 0) {
    if (!node) return;
    if (node.type === "doc" || node.type === "tableRow" || node.type === "tableHeader") {
      node.content?.forEach((c: PMNode) => walk(c, depth));
    } else if (node.type === "paragraph") {
      let text = "";
      node.content?.forEach((c: PMNode) => {
        if (c.type === "text") {
          let t = (c as PMTextNode).text || "";
          if (c.marks) {
            c.marks.forEach((m) => {
              if (m.type === "bold") t = `**${t}**`;
              if (m.type === "italic") t = `_${t}_`;
              if (m.type === "strike") t = `~~${t}~~`;
              if (m.type === "code") t = `\`${t}\``;
              if (m.type === "link") t = `[${t}](${(m.attrs as { href?: string })?.href || ""})`;
            });
          }
          text += t;
        } else if (c.type === "image") {
          text += `![${(c.attrs as { alt?: string })?.alt || ""}](${(c.attrs as { src?: string })?.src || ""})`;
        } else if (c.type === "hardBreak") {
          text += "\n";
        }
      });
      lines.push(text);
      lines.push("");
    } else if (node.type === "heading") {
      const level = (node.attrs as { level?: number })?.level || 1;
      let text = "";
      node.content?.forEach((c: PMNode) => { if (c.text) text += c.text; });
      lines.push(`${"#".repeat(level)} ${text}`);
      lines.push("");
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      node.content?.forEach((c: PMNode) => walk(c, depth));
    } else if (node.type === "listItem") {
      let text = "";
      node.content?.forEach((c: PMNode) => {
        if (c.type === "paragraph") {
          c.content?.forEach((cc: PMNode) => {
            if (cc.type === "text") {
              let t = (cc as PMTextNode).text || "";
              if (cc.marks) {
                cc.marks.forEach((m) => {
                  if (m.type === "bold") t = `**${t}**`;
                  if (m.type === "italic") t = `_${t}_`;
                  if (m.type === "code") t = `\`${t}\``;
                  if (m.type === "link") t = `[${t}](${(m.attrs as { href?: string })?.href || ""})`;
                });
              }
              text += t;
            }
          });
        }
      });
      lines.push(`- ${text}`);
    } else if (node.type === "codeBlock") {
      let text = "";
      node.content?.forEach((c: PMNode) => { if (c.text) text += c.text; });
      const lang = (node.attrs as { language?: string })?.language || "";
      lines.push(`\`\`\`${lang}`);
      lines.push(text);
      lines.push("```");
      lines.push("");
    } else if (node.type === "blockquote") {
      node.content?.forEach((c: PMNode) => {
        const before = lines.length;
        walk(c, depth + 1);
        for (let i = before; i < lines.length; i++) {
          if (lines[i]) lines[i] = `> ${lines[i]}`;
        }
      });
    } else if (node.type === "horizontalRule") {
      lines.push("---");
      lines.push("");
    } else if (node.type === "callout") {
      const ctype = (node.attrs as { type?: string })?.type || "info";
      lines.push(`> [!${ctype.toUpperCase()}]`);
      node.content?.forEach((c: PMNode) => walk(c, depth + 1));
      lines.push("");
    } else if (node.type === "taskList") {
      node.content?.forEach((c: PMNode) => walk(c, depth));
    } else if (node.type === "taskItem") {
      const checked = (node.attrs as { checked?: boolean })?.checked ? "x" : " ";
      let text = "";
      node.content?.forEach((c: PMNode) => {
        if (c.type === "paragraph") {
          c.content?.forEach((cc: PMNode) => { if (cc.text) text += cc.text; });
        }
      });
      lines.push(`- [${checked}] ${text}`);
    } else if (node.type === "table") {
      const rows: string[][] = [];
      node.content?.forEach((row: PMNode) => {
        const cells: string[] = [];
        row.content?.forEach((cell: PMNode) => {
          let text = "";
          cell.content?.forEach((p: PMNode) => {
            p.content?.forEach((cc: PMNode) => { if (cc.text) text += cc.text; });
          });
          cells.push(text);
        });
        rows.push(cells);
      });
      if (rows.length > 0) {
        const colCount = rows[0].length;
        rows.forEach((row, i) => {
          lines.push("| " + row.join(" | ") + " |");
          if (i === 0) lines.push("| " + "---".repeat(colCount) + " |");
        });
        lines.push("");
      }
    } else {
      node.content?.forEach((c: PMNode) => walk(c, depth));
    }
  }
  walk(doc);
  return lines.join("\n").trim();
}

export function tiptapToHTML(json: PMNode): string {
  if (!json || typeof json !== "object") return "";
  const { type, attrs, content, marks, text } = json;
  if (type === "doc") {
    return (content || []).map((c: PMNode) => tiptapToHTML(c)).join("\n");
  }
  if (type === "paragraph") {
    const inner = (content || []).map((c: PMNode) => tiptapToHTML(c)).join("");
    return `<p>${inner}</p>`;
  }
  if (type === "heading") {
    const level = (attrs as { level?: number })?.level || 1;
    const inner = (content || []).map((c: PMNode) => tiptapToHTML(c)).join("");
    return `<h${level}>${inner}</h${level}>`;
  }
  if (type === "text") {
    let t = text || "";
    if (marks) {
      for (const m of marks) {
        if (m.type === "bold") t = `<strong>${t}</strong>`;
        else if (m.type === "italic") t = `<em>${t}</em>`;
        else if (m.type === "underline") t = `<u>${t}</u>`;
        else if (m.type === "strike") t = `<s>${t}</s>`;
        else if (m.type === "code") t = `<code>${t}</code>`;
        else if (m.type === "link") t = `<a href="${(m.attrs as { href?: string })?.href || ""}">${t}</a>`;
      }
    }
    return t;
  }
  if (type === "bulletList") {
    return `<ul>${(content || []).map((c: PMNode) => tiptapToHTML(c)).join("")}</ul>`;
  }
  if (type === "orderedList") {
    return `<ol>${(content || []).map((c: PMNode) => tiptapToHTML(c)).join("")}</ol>`;
  }
  if (type === "listItem") {
    return `<li>${(content || []).map((c: PMNode) => tiptapToHTML(c)).join("")}</li>`;
  }
  if (type === "codeBlock") {
    const code = (content || []).map((c: PMNode) => c.text || "").join("\n");
    return `<pre><code>${code}</code></pre>`;
  }
  if (type === "blockquote") {
    return `<blockquote>${(content || []).map((c: PMNode) => tiptapToHTML(c)).join("")}</blockquote>`;
  }
  if (type === "horizontalRule") {
    return `<hr />`;
  }
  if (type === "image") {
    return `<img src="${(attrs as { src?: string })?.src || ""}" alt="${(attrs as { alt?: string })?.alt || ""}" />`;
  }
  if (type === "taskList") {
    return `<ul>${(content || []).map((c: PMNode) => tiptapToHTML(c)).join("")}</ul>`;
  }
  if (type === "taskItem") {
    const checked = (attrs as { checked?: boolean })?.checked ? "checked" : "";
    return `<li><input type="checkbox" ${checked} disabled />${(content || []).map((c: PMNode) => tiptapToHTML(c)).join("")}</li>`;
  }
  if (type === "hardBreak") {
    return "<br />";
  }
  if (content) {
    return (content || []).map((c: PMNode) => tiptapToHTML(c)).join("");
  }
  return "";
}
