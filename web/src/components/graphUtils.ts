import type { Page, Collection } from '../lib/api';

/**
 * Pure graph-construction logic for GraphView.
 *
 * Given pages + collections, build the graph nodes and links:
 * - one collection node per collection (color by index)
 * - one page node per non-deleted page (color by its collection)
 * - parent-child links for nested pages
 * - collection-membership links
 * - backlinks extracted from /page/xxx URLs in page text_content (deduped)
 */

export interface GraphNode {
  id: string;
  title: string;
  icon: string;
  color: string;
  collectionId: string;
  collectionName: string;
  isCollection: boolean;
}

export type GraphLinkType = 'parent-child' | 'collection' | 'backlink';

export interface GraphLink {
  source: string;
  target: string;
  type: GraphLinkType;
}

const COLLECTION_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#d946ef',
  '#00FFFF',
  '#a855f7',
  '#eab308',
];

export function getColor(i: number): string {
  return COLLECTION_COLORS[i % COLLECTION_COLORS.length];
}

/** Match /page/<id> URLs (alphanumeric + _ -) in text. */
export function extractPageLinks(text: string): string[] {
  const re = /\/page\/([a-zA-Z0-9_-]+)/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[1]);
  }
  return out;
}

export interface GraphBuildInput {
  pages: Page[];
  collections: Collection[];
}

export function buildGraph(pages: Page[], collections: Collection[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const gNodes: GraphNode[] = [];
  const nodeIds = new Set<string>();
  const colColor = new Map<string, string>();
  collections.forEach((col, i) => colColor.set(col.id, col.color || getColor(i)));

  collections.forEach((col) => {
    const n: GraphNode = {
      id: `col:${col.id}`,
      title: col.name,
      icon: col.icon || '📁',
      color: colColor.get(col.id) || getColor(collections.indexOf(col)),
      collectionId: col.id,
      collectionName: col.name,
      isCollection: true,
    };
    gNodes.push(n);
    nodeIds.add(n.id);
  });

  const active = pages.filter((p) => p.status !== 'deleted');
  active.forEach((page) => {
    const col = collections.find((c) => c.id === page.collection_id);
    const n: GraphNode = {
      id: page.id,
      title: page.title,
      icon: page.icon || '📄',
      color: colColor.get(page.collection_id) || '#666',
      collectionId: page.collection_id,
      collectionName: col?.name || 'Uncategorized',
      isCollection: false,
    };
    gNodes.push(n);
    nodeIds.add(n.id);
  });

  const gLinks: GraphLink[] = [];

  active.forEach((page) => {
    if (page.parent_page_id && nodeIds.has(page.parent_page_id)) {
      gLinks.push({ source: page.id, target: page.parent_page_id, type: 'parent-child' });
    }
  });

  active.forEach((page) => {
    const cid = `col:${page.collection_id}`;
    if (nodeIds.has(cid)) {
      gLinks.push({ source: page.id, target: cid, type: 'collection' });
    }
  });

  active.forEach((page) => {
    if (!page.text_content) return;
    for (const tid of extractPageLinks(page.text_content)) {
      if (tid !== page.id && nodeIds.has(tid)) {
        const exists = gLinks.some(
          (l) => l.source === page.id && l.target === tid && l.type === 'backlink',
        );
        if (!exists) gLinks.push({ source: page.id, target: tid, type: 'backlink' });
      }
    }
  });

  return { nodes: gNodes, links: gLinks };
}
