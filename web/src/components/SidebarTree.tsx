import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronDown, ChevronRight, FileText, Hash, Library, Plus, FolderPlus, Trash2,
  Archive, Tags, CheckSquare, Square, Pin, Star, MoreHorizontal,
  History, Share2, Code, LayoutTemplate, X, Download,
} from "lucide-react";
import { cn, timeAgo } from "../lib/utils";
import { api, Page, Collection } from "../lib/api";
import { useToast } from "./Toast";

const PAGE_LIMIT = 50;

interface SidebarTreeProps {
  // Data
  collectionTree: (Collection & { children: Collection[] })[];
  pages: Page[];
  pagesByCollection: Record<string, Page[]>;
  collections: Collection[];
  favoritePages: Page[];
  searchQuery: string;
  loading: boolean;

  // Navigation
  isActive: (pageId: string) => boolean;

  // Collections
  expandedCollections: Set<string>;
  toggleCollection: (id: string) => void;
  openEditCol: (col: Collection) => void;
  openCreateCol: () => void;
  openTemplates: () => void;
  loadTrashPage: () => void;

  // Drag & drop state
  dragPageId: string | null;
  dragColId: string | null;
  dragOverTarget: string | null;
  handleDragStart: (e: React.DragEvent, pageId: string) => void;
  handleColDragStart: (e: React.DragEvent, colId: string) => void;
  handleDragOver: (e: React.DragEvent, pageId?: string) => void;
  handleDragLeave: () => void;
  handleDragEnd: () => void;
  handleDropOnCollection: (e: React.DragEvent, colId: string) => void;
  handleDropOnPage: (e: React.DragEvent, targetPageId: string) => void;
  setDragOverTarget: (id: string | null) => void;

  // Page selection
  selectedPageIds: Set<string>;
  togglePageSelection: (pageId: string, e: React.MouseEvent) => void;
  clearSelection: () => void;

  // Batch operations
  handleBatchArchive: () => Promise<void>;
  handleBatchDelete: () => Promise<void>;
  handleBatchMove: (newColId: string) => Promise<void>;
  handleBatchTag: () => Promise<void>;

  // Page helpers
  handlePageClick: (pageId: string, e: React.MouseEvent) => void;
  setContextMenu: (menu: { x: number; y: number; colId?: string; pageId?: string } | null) => void;

  // Limits & more
  pageLimits: Record<string, number>;
  setPageLimits: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  setBatchMoveOpen: (open: boolean) => void;
  setBatchTagOpen: (open: boolean) => void;
  batchMoveOpen: boolean;
  batchTagOpen: boolean;
  batchTagName: string;
  setBatchTagName: (name: string) => void;
  batchTagValue: string;
  setBatchTagValue: (value: string) => void;
  navigate: (path: string) => void;
}

export function SidebarTree({
  collectionTree, pages, pagesByCollection, collections, favoritePages,
  searchQuery, loading, isActive,
  expandedCollections, toggleCollection, openEditCol, openCreateCol, openTemplates, loadTrashPage,
  dragPageId, dragColId, dragOverTarget,
  handleDragStart, handleColDragStart, handleDragOver, handleDragLeave, handleDragEnd,
  handleDropOnCollection, handleDropOnPage, setDragOverTarget,
  selectedPageIds, togglePageSelection, clearSelection,
  handleBatchArchive, handleBatchDelete, handleBatchMove, handleBatchTag,
  handlePageClick, setContextMenu,
  pageLimits, setPageLimits,
  setBatchMoveOpen, setBatchTagOpen, batchMoveOpen, batchTagOpen,
  batchTagName, setBatchTagName, batchTagValue, setBatchTagValue,
  navigate,
}: SidebarTreeProps) {
  const renderColTree = (tree: (Collection & { children: Collection[] })[], depth: number) => {
    return tree.map((col) => {
      const colPages = pagesByCollection[col.id] || [];
      const expanded = expandedCollections.has(col.id);
      const childCount = col.children.length;
      return (
        <div key={col.id} className="mb-0.5">
          <div className="flex items-center group" style={depth > 0 ? { paddingLeft: depth * 16 } : undefined}>
            <button
              onClick={() => toggleCollection(col.id)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, colId: col.id }); }}
              draggable
              onDragStart={(e) => handleColDragStart(e, col.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverTarget(col.id); }}
              onDrop={(e) => handleDropOnCollection(e, col.id)}
              onDragEnd={handleDragEnd}
              className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-left cursor-grab active:cursor-grabbing"
            >
              {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
              <span className="text-xs">{col.icon || "📁"}</span>
              <span className="truncate">{col.name}</span>
              <span className="text-[10px] text-muted-foreground/50 ml-auto">{colPages.length}{childCount > 0 ? ` +${childCount}` : ""}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); openEditCol(col); }} className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </div>
          {expanded && (
            <>
              {(col as any).children.length > 0 && renderColTree((col as any).children as any, depth + 1)}
              {colPages.slice(0, pageLimits[col.id] || PAGE_LIMIT).map((page: any) => (
                <div key={page.id} draggable onDragStart={(e) => handleDragStart(e, page.id)}
                  onDragOver={(e) => handleDragOver(e, page.id)} onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnPage(e, page.id)} onDragEnd={handleDragEnd}
                  className={cn("w-full flex items-center gap-0.5 pl-2 pr-2 py-0.5 rounded-md text-xs transition-colors group/page", isActive(page.id) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50", selectedPageIds.has(page.id) && "bg-primary/5 ring-1 ring-primary/20", dragOverTarget === page.id && "ring-1 ring-primary/40 bg-primary/5")}>
                  <button onClick={(e) => togglePageSelection(page.id, e)} className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground shrink-0 opacity-0 group-hover/page:opacity-100 transition-opacity" title={selectedPageIds.has(page.id) ? "Deselect" : "Select"}>
                    {selectedPageIds.has(page.id) ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={(e) => handlePageClick(page.id, e)} className="flex-1 flex items-center gap-1.5 min-w-0 text-left">
                    {page.icon || <FileText className="h-3.5 w-3.5 shrink-0" />}
                    {page.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: page.color }} />}
                    {page.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary" fill="currentColor" />}
                    <span className="truncate">{page.title}</span>
                    {searchQuery && page.text_content && (
                      <span className="block text-[11px] text-muted-foreground/60 mt-0.5 max-w-full leading-relaxed">
                        {(() => {
                          const q = searchQuery.toLowerCase();
                          const text = page.text_content.replace(/\n/g, " ");
                          const idx = text.toLowerCase().indexOf(q);
                          if (idx < 0) return text.slice(0, 80);
                          const start = Math.max(0, idx - 30);
                          const end = Math.min(text.length, idx + q.length + 50);
                          const snippet = text.slice(start, end);
                          const parts: React.ReactNode[] = [];
                          const lowerSnippet = snippet.toLowerCase();
                          let cursor = 0;
                          let matchIdx = lowerSnippet.indexOf(q, cursor);
                          if (start > 0) parts.push(<span key="lead" className="opacity-50">…</span>);
                          while (matchIdx >= 0) {
                            if (matchIdx > cursor) parts.push(<span key={`t-${cursor}`}>{snippet.slice(cursor, matchIdx)}</span>);
                            parts.push(<mark key={`m-${matchIdx}`} className="bg-yellow-500/30 text-foreground rounded-sm px-0.5">{snippet.slice(matchIdx, matchIdx + q.length)}</mark>);
                            cursor = matchIdx + q.length;
                            matchIdx = lowerSnippet.indexOf(q, cursor);
                          }
                          if (cursor < snippet.length) parts.push(<span key={`t-${cursor}`}>{snippet.slice(cursor)}</span>);
                          if (end < text.length) parts.push(<span key="trail" className="opacity-50">…</span>);
                          return parts;
                        })()}
                      </span>
                    )}
                    {page.status === "draft" && <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500 shrink-0">Draft</span>}
                    {page.status === "archived" && <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">Archived</span>}
                    {page.is_template && <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 shrink-0">Template</span>}
                  </button>
                </div>
              ))}
              {colPages.length > (pageLimits[col.id] || PAGE_LIMIT) && (
                <button onClick={() => setPageLimits(prev => ({ ...prev, [col.id]: (prev[col.id] || PAGE_LIMIT) + PAGE_LIMIT }))} className="w-full flex items-center gap-2 pl-8 pr-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md transition-colors text-left">
                  <ChevronDown className="h-3 w-3 shrink-0" /> Show {colPages.length - (pageLimits[col.id] || PAGE_LIMIT)} more
                </button>
              )}
            </>
          )}
        </div>
      );
    });
  };

  return (
    <>
      {/* Favorites */}
      {favoritePages.length > 0 && (
        <div className="px-2 py-1 mb-1">
          <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider px-2 mb-1">Favorites</p>
          {favoritePages.map(p => (
            <button key={p.id} onClick={() => navigate(`/page/${p.id}`)}
              className={cn("w-full flex items-center gap-2 pl-2 pr-2 py-1 rounded-md text-xs transition-colors text-left",
                isActive(p.id) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
            >
              {p.icon || <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0" fill="currentColor" />}
              {p.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
              {p.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary" fill="currentColor" />}
              <span className="truncate">{p.title}</span>
            </button>
          ))}
          <div className="h-px bg-border/50 mx-2 mt-2 mb-1" />
        </div>
      )}

      {/* Collections + Pages tree */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {loading ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">Loading...</div>
        ) : (
          <>
            {renderColTree(collectionTree, 0)}

            {/* Uncategorized pages */}
            {pagesByCollection["uncategorized"]?.length > 0 && (
              <div className="mb-0.5">
                <button onClick={() => toggleCollection("uncategorized")}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  {expandedCollections.has("uncategorized") ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                  <Hash className="h-3.5 w-3.5" /> Uncategorized
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">{pagesByCollection["uncategorized"].length}</span>
                </button>
                {expandedCollections.has("uncategorized") && pagesByCollection["uncategorized"].slice(0, pageLimits["uncategorized"] || PAGE_LIMIT).map((page: any) => (
                  <div key={page.id} draggable onDragStart={(e) => handleDragStart(e, page.id)}
                    onDragOver={(e) => handleDragOver(e, page.id)} onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropOnPage(e, page.id)} onDragEnd={handleDragEnd}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, pageId: page.id }); }}
                    className={cn("w-full flex items-center gap-0.5 pl-2 pr-2 py-0.5 rounded-md text-xs transition-colors group/page",
                      isActive(page.id) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      selectedPageIds.has(page.id) && "bg-primary/5 ring-1 ring-primary/20", dragOverTarget === page.id && "ring-1 ring-primary/40 bg-primary/5")}>
                    <button onClick={(e) => togglePageSelection(page.id, e)} className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground shrink-0 opacity-0 group-hover/page:opacity-100 transition-opacity" title={selectedPageIds.has(page.id) ? "Deselect" : "Select"}>
                      {selectedPageIds.has(page.id) ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={(e) => handlePageClick(page.id, e)} className="flex-1 flex items-center gap-1.5 min-w-0 text-left">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      {page.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: page.color }} />}
                      {page.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary" fill="currentColor" />}
                      <span className="truncate">{page.title}</span>
                      {page.status === "draft" && <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-yellow-500/10 text-yellow-500 shrink-0">Draft</span>}
                      {page.status === "archived" && <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">Archived</span>}
                      {page.is_template && <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 shrink-0">Template</span>}
                    </button>
                  </div>
                ))}
                {(pagesByCollection["uncategorized"]?.length || 0) > (pageLimits["uncategorized"] || PAGE_LIMIT) && (
                  <button onClick={() => setPageLimits(prev => ({ ...prev, "uncategorized": (prev["uncategorized"] || PAGE_LIMIT) + PAGE_LIMIT }))}
                    className="w-full flex items-center gap-2 pl-8 pr-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md transition-colors text-left">
                    <ChevronDown className="h-3 w-3 shrink-0" />
                    Show {(pagesByCollection["uncategorized"]?.length || 0) - (pageLimits["uncategorized"] || PAGE_LIMIT)} more
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {collections.length === 0 && Object.keys(pagesByCollection).length === 0 && (
              <div className="px-3 py-6 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                  <Library className="h-5 w-5 text-primary/60" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">Welcome! Your wiki is empty.</p>
                <button onClick={() => navigate("/new")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Plus className="h-3 w-3" /> Create first page
                </button>
              </div>
            )}
          </>
        )}
      </nav>

      {/* ── Batch action bar ── */}
      {selectedPageIds.size > 0 && (
        <div className="px-2 py-2 border-t border-border bg-muted/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] text-muted-foreground font-medium px-1">{selectedPageIds.size} selected</span>
            <button onClick={clearSelection} className="text-[10px] text-muted-foreground/60 hover:text-foreground ml-auto px-1">Clear</button>
          </div>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setBatchMoveOpen(true)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <FolderPlus className="h-3 w-3" /> Move
            </button>
            <button onClick={handleBatchArchive} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors">
              <Archive className="h-3 w-3" /> Archive
            </button>
            <button onClick={() => setBatchTagOpen(true)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
              <Tags className="h-3 w-3" /> Tag
            </button>
            <button onClick={handleBatchDelete} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* ── Batch Move dialog ── */}
      {batchMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setBatchMoveOpen(false)}>
          <div className="w-full max-w-sm mx-4 p-4 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3">Move {selectedPageIds.size} page(s)</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
              {collections.map((col) => (
                <button key={col.id} onClick={() => handleBatchMove(col.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-muted transition-colors text-left">
                  <span>{col.icon || "📁"}</span>
                  <span className="truncate">{col.name}</span>
                </button>
              ))}
              <button onClick={() => handleBatchMove("")} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs hover:bg-muted transition-colors text-left">
                <Hash className="h-3.5 w-3.5" /> Uncategorized
              </button>
            </div>
            <button onClick={() => setBatchMoveOpen(false)} className="w-full py-2 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Batch Tag dialog ── */}
      {batchTagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setBatchTagOpen(false)}>
          <div className="w-full max-w-sm mx-4 p-4 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3">Add tag to {selectedPageIds.size} page(s)</h3>
            <div className="space-y-2 mb-3">
              <input type="text" value={batchTagName} onChange={(e) => setBatchTagName(e.target.value)} placeholder="Tag name (e.g. 'department')"
                className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <input type="text" value={batchTagValue} onChange={(e) => setBatchTagValue(e.target.value)} placeholder="Tag value (e.g. 'engineering')"
                className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleBatchTag} disabled={!batchTagName.trim()}
                className="flex-1 h-8 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">Add Tag</button>
              <button onClick={() => setBatchTagOpen(false)} className="flex-1 h-8 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}