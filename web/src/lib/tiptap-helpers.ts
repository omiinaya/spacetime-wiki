/** Convert simple HTML (Notion HTML export) to ProseMirror JSON */
export function htmlToProseMirror(html: string): any {
  const doc: any = { type: "doc", content: [] };
  const div = document.createElement("div");
  div.innerHTML = html;
  for (const node of div.childNodes) {
    if (node.nodeType === 3) { // text node
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
      const items: any[] = [];
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
      const rows: any[] = [];
      el.querySelectorAll(":scope > tr, :scope > thead > tr, :scope > tbody > tr").forEach((tr) => {
        const cells: any[] = [];
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

export function extractInlineContent(el: HTMLElement): any[] {
  const content: any[] = [];
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

export function markdownToProseMirror(md: string): any {
  const doc: any = { type: "doc", content: [] };
  const lines = md.split("\n");
  let i = 0;
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];

  function addParagraph(text: string) {
    if (!text.trim()) return;
    const content: any[] = [];
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

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      doc.content.push({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line)) {
      doc.content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const text = line.slice(2);
      doc.content.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*+]\s+/, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }] });
        i++;
      }
      doc.content.push({ type: "bulletList", content: items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: itemText }] }] });
        i++;
      }
      doc.content.push({ type: "orderedList", content: items });
      continue;
    }

    // Task list
    if (/^\s*[-*+]\s+[[ x]\]\]\s+/i.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^\s*[-*+]\s+[[ x]\]\]\s+/i.test(lines[i])) {
        const checked = lines[i].includes("[x]") || lines[i].includes("[X]");
        const text = lines[i].replace(/^\s*[-*+]\s+[[ x]\]\]\s+/i, "");
        items.push({ type: "taskItem", attrs: { checked }, content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
        i++;
      }
      doc.content.push({ type: "taskList", content: items });
      continue;
    }

    // Default: paragraph
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

export function tiptapToMarkdown(doc: any): string {
  const lines: string[] = [];
  function walk(node: any, depth = 0) {
    if (!node) return;
    if (node.type === "doc" || node.type === "tableRow" || node.type === "tableHeader") {
      node.content?.forEach((c: any) => walk(c, depth));
    } else if (node.type === "paragraph") {
      let text = "";
      node.content?.forEach((c: any) => {
        if (c.type === "text") {
          let t = c.text || "";
          if (c.marks) {
            c.marks.forEach((m: any) => {
              if (m.type === "bold") t = `**${t}**`;
              if (m.type === "italic") t = `_${t}_`;
              if (m.type === "strike") t = `~~${t}~~`;
              if (m.type === "code") t = `\`${t}\``;
              if (m.type === "link") t = `[${t}](${m.attrs?.href || ""})`;
            });
          }
          text += t;
        } else if (c.type === "image") {
          text += `![${c.attrs?.alt || ""}](${c.attrs?.src || ""})`;
        } else if (c.type === "hardBreak") {
          text += "\n";
        }
      });
      lines.push(text);
      lines.push("");
    } else if (node.type === "heading") {
      const level = node.attrs?.level || 1;
      let text = "";
      node.content?.forEach((c: any) => { if (c.text) text += c.text; });
      lines.push(`${"#".repeat(level)} ${text}`);
      lines.push("");
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      node.content?.forEach((c: any) => walk(c, depth));
    } else if (node.type === "listItem") {
      let text = "";
      node.content?.forEach((c: any) => {
        if (c.type === "paragraph") {
          c.content?.forEach((cc: any) => {
            if (cc.type === "text") {
              let t = cc.text || "";
              if (cc.marks) {
                cc.marks.forEach((m: any) => {
                  if (m.type === "bold") t = `**${t}**`;
                  if (m.type === "italic") t = `_${t}_`;
                  if (m.type === "code") t = `\`${t}\``;
                  if (m.type === "link") t = `[${t}](${m.attrs?.href || ""})`;
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
      node.content?.forEach((c: any) => { if (c.text) text += c.text; });
      const lang = node.attrs?.language || "";
      lines.push(`\`\`\`${lang}`);
      lines.push(text);
      lines.push("```");
      lines.push("");
    } else if (node.type === "blockquote") {
      node.content?.forEach((c: any) => {
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
      const ctype = node.attrs?.type || "info";
      lines.push(`> [!${ctype.toUpperCase()}]`);
      node.content?.forEach((c: any) => walk(c, depth + 1));
      lines.push("");
    } else if (node.type === "taskList") {
      node.content?.forEach((c: any) => walk(c, depth));
    } else if (node.type === "taskItem") {
      const checked = node.attrs?.checked ? "x" : " ";
      let text = "";
      node.content?.forEach((c: any) => {
        if (c.type === "paragraph") {
          c.content?.forEach((cc: any) => { if (cc.text) text += cc.text; });
        }
      });
      lines.push(`- [${checked}] ${text}`);
    } else if (node.type === "table") {
      const rows: string[][] = [];
      node.content?.forEach((row: any) => {
        const cells: string[] = [];
        row.content?.forEach((cell: any) => {
          let text = "";
          cell.content?.forEach((p: any) => {
            p.content?.forEach((cc: any) => { if (cc.text) text += cc.text; });
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
      node.content?.forEach((c: any) => walk(c, depth));
    }
  }
  walk(doc);
  return lines.join("\n").trim();
}

export function tiptapToHTML(doc: any): string {
  if (!doc || !doc.content) return "";
  let html = "";
  for (const node of doc.content) {
    switch (node.type) {
      case "heading": {
        const level = node.attrs?.level || 1;
        html += `<h${level}>${node.content?.map((n: any) => n.text || "").join("") || ""}</h${level}>\n`;
        break;
      }
      case "paragraph":
        html += `<p>${node.content?.map((n: any) => n.text || "").join("") || ""}</p>\n`;
        break;
      case "bulletList":
        html += "<ul>\n";
        for (const item of node.content || []) {
          html += `<li>${item.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || n.text || "").join("") || ""}</li>\n`;
        }
        html += "</ul>\n";
        break;
      case "orderedList":
        html += "<ol>\n";
        for (const item of node.content || []) {
          html += `<li>${item.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || n.text || "").join("") || ""}</li>\n`;
        }
        html += "</ol>\n";
        break;
      case "codeBlock":
        html += `<pre><code>${node.content?.map((n: any) => n.text || "").join("") || ""}</code></pre>\n`;
        break;
      case "blockquote": {
        const qText = node.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || "").join("") || "";
        html += `<blockquote>${qText}</blockquote>\n`;
        break;
      }
      case "horizontalRule":
        html += "<hr />\n";
        break;
      case "callout": {
        const ctype = node.attrs?.type || "info";
        const colorClass = ctype === "warning" ? "border-amber-500 bg-amber-50" :
          ctype === "tip" ? "border-emerald-500 bg-emerald-50" :
          ctype === "danger" ? "border-red-500 bg-red-50" :
          "border-blue-500 bg-blue-50";
        const icon = ctype === "warning" ? "⚠️" : ctype === "tip" ? "💡" : ctype === "danger" ? "🚨" : "ℹ️";
        html += `<div class="callout ${colorClass}" style="border-left:4px solid;padding:12px;margin:12px 0;border-radius:6px">`;
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:12px;font-weight:600;text-transform:uppercase">`;
        html += `<span>${icon}</span><span>${ctype}</span></div>`;
        html += `<div>${node.content?.map((n: any) => n.content?.map((m: any) => m.text || "").join("") || n.text || "").join("") || ""}</div></div>\n`;
        break;
      }
      case "image":
        html += `<img src="${node.attrs?.src || ""}" alt="${node.attrs?.alt || ""}" />\n`;
        break;
      default:
        if (node.text) html += node.text;
        break;
    }
  }
  return html;
}

export function arrayBufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
