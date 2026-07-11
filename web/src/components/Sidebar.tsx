import { Search, Plus, FolderPlus, Library, X, History, Share2, Code, LayoutTemplate, Trash2, Shield, MessageSquare, Upload, Package, Download, Sun, Moon, Keyboard, Loader2, Menu } from "lucide-react";
import { cn } from "../lib/utils";
import { SidebarTree } from "./SidebarTree";
import { SearchFilters } from "./SearchFilters";
import { NotificationBell } from "./NotificationBell";
import type { Page, Collection } from "../lib/api";
import type { SearchFilterState } from "../components/SearchFilters";

interface SidebarProps {
  // Core data
  pages: Page[];
  collections: Collection[];
  collectionTree: (Collection & { children: unknown[] })[];
  pagesByCollection: Record<string, Page[]>;
  favoritePages: Page[];
  loading: boolean;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchFilters: SearchFilterState;
  setSearchFilters: (f: SearchFilterState) => void;
  handleSearchInput: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Navigation/UI
  isActive: (pageId: string) => boolean;
  navigate: (path: string) => void;
  userId: string | null;
  notificationList: unknown[];
  refreshNotifications: () => void;

  // Sidebar tree props
  expandedCollections: Set<string>;
  toggleCollection: (id: string) => void;
  openEditCol: (col: Collection) => Promise<void>;
  openCreateCol: () => void;
  pageLimits: Record<string, number>;
  setPageLimits: (fn: (prev: Record<string, number>) => Record<string, number>) => void;

  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  sidebarOverlayRef: React.RefObject<HTMLDivElement | null>;
  sidebarOverlayVisible: boolean;
  setSidebarOverlayVisible: (v: boolean) => void;
  sidebarDragRef: React.MutableRefObject<boolean>;
  sidebarElRef: React.RefObject<HTMLDivElement | null>;
  touchStartRef: React.MutableRefObject<number>;
  sidebarTouchDelta: React.MutableRefObject<number>;
  SIDEBAR_W: number;
  sidebarNavRef: React.RefObject<HTMLDivElement | null>;

  // Import refs
  importRef: React.RefObject<HTMLInputElement | null>;
  notionImportRef: React.RefObject<HTMLInputElement | null>;
  confluenceImportRef: React.RefObject<HTMLInputElement | null>;

  // Import state
  importing: boolean;
  importingNotion: boolean;
  importingConfluence: boolean;

  // Drag-drop
  dragPageId: string | null;
  dragColId: string | null;
  dragOverTarget: string | null;
  setDragOverTarget: (v: string | null) => void;
  handleDragStart: (e: React.DragEvent, pageId: string) => void;
  handleColDragStart: (e: React.DragEvent, colId: string) => void;
  handleDragOver: (e: React.DragEvent, pageId?: string) => void;
  handleDragLeave: () => void;
  handleDragEnd: () => void;
  handleDropOnCollection: (e: React.DragEvent, colId: string) => Promise<void>;
  handleDropOnPage: (e: React.DragEvent, targetPageId: string) => Promise<void>;
  handlePageClick: (pageId: string, e: React.MouseEvent) => void;

  // Batch actions
  selectedPageIds: Set<string>;
  togglePageSelection: (pageId: string, e: React.MouseEvent) => void;
  clearSelection: () => void;
  handleBatchArchive: () => Promise<void>;
  handleBatchDelete: () => Promise<void>;
  handleBatchMove: (colId: string) => Promise<void>;
  handleBatchTag: () => Promise<void>;
  setBatchMoveOpen: (v: boolean) => void;
  setBatchTagOpen: (v: boolean) => void;
  batchMoveOpen: boolean;
  batchTagOpen: boolean;
  batchTagName: string;
  setBatchTagName: (v: string) => void;
  batchTagValue: string;
  setBatchTagValue: (v: string) => void;

  // Context menu
  setContextMenu: (v: { x: number; y: number; colId?: string; pageId?: string } | null) => void;

  // Actions
  openTemplates: () => Promise<void>;
  loadTrashPage: () => Promise<void>;
  setAiAssistantOpen: (v: boolean) => void;
  setTemplatePickerOpen: (v: boolean) => void;
  setShortcutsOpen: (v: boolean) => void;

  // Theme
  theme: "dark" | "light";
  setTheme: (v: "dark" | "light") => void;

  // Import click handlers
  handleImportMD: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleImportNotion: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleImportConfluence: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function Sidebar(props: SidebarProps) {
  const { sidebarOpen, setSidebarOpen, sidebarDragRef, touchStartRef, sidebarTouchDelta, SIDEBAR_W, sidebarElRef } = props;

  return (
    <aside
      ref={sidebarElRef}
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-sidebar border-r border-border flex flex-col transition-transform duration-200 ease-out md:relative md:translate-x-0",
        sidebarDragRef.current ? "" : (sidebarOpen ? "translate-x-0" : "-translate-x-full"),
      )}
      onTouchStart={(e) => {
        props.touchStartRef.current = e.touches[0].clientX;
        if (!sidebarOpen) {
          if (props.touchStartRef.current < 30) {
            sidebarDragRef.current = true;
            props.sidebarTouchDelta.current = 0;
          }
        } else {
          sidebarDragRef.current = true;
          props.sidebarTouchDelta.current = 0;
        }
      }}
      onTouchMove={(e) => {
        if (!sidebarDragRef.current) return;
        const dx = e.touches[0].clientX - touchStartRef.current;
        props.sidebarTouchDelta.current = dx;
        const el = sidebarElRef.current;
        if (!el) return;
        el.style.transition = "none";
        if (!sidebarOpen) {
          const offset = Math.min(Math.max(dx, 0), SIDEBAR_W);
          el.style.transform = `translateX(${offset - SIDEBAR_W}px)`;
          const progress = offset / SIDEBAR_W;
          if (progress > 0.05 && !props.sidebarOverlayVisible) props.setSidebarOverlayVisible(true);
          const ov = props.sidebarOverlayRef.current;
          if (ov) ov.style.opacity = String(progress * 0.6);
        } else {
          const offset = Math.max(-dx, -SIDEBAR_W);
          el.style.transform = `translateX(${offset}px)`;
          const progress = Math.abs(dx) / SIDEBAR_W;
          const ov = props.sidebarOverlayRef.current;
          if (ov) ov.style.opacity = String((1 - progress) * 0.6);
        }
      }}
      onTouchEnd={() => {
        if (!sidebarDragRef.current) return;
        sidebarDragRef.current = false;
        const el = sidebarElRef.current;
        if (!el) return;
        el.style.transition = "";
        el.style.transform = "";
        const progress = Math.abs(props.sidebarTouchDelta.current) / SIDEBAR_W;
        if (!sidebarOpen && props.sidebarTouchDelta.current > 60) {
          setSidebarOpen(true);
          props.setSidebarOverlayVisible(true);
        } else if (sidebarOpen && progress > 0.4) {
          setSidebarOpen(false);
          props.setSidebarOverlayVisible(false);
        }
        if (!sidebarOpen && props.sidebarTouchDelta.current <= 60) {
          props.setSidebarOverlayVisible(false);
        }
        props.sidebarTouchDelta.current = 0;
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-md bg-linear-to-br from-primary to-purple-600 flex items-center justify-center shrink-0">
          <Library className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="font-semibold text-sm">Spacetime Wiki</span>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell userId={props.userId} notifications={props.notificationList} onRefresh={props.refreshNotifications} />
          <button className="md:hidden p-1" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input type="text" placeholder="Search..." value={props.searchQuery} onChange={props.handleSearchInput}
            className="w-full h-8 pl-8 pr-7 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
          {props.searchQuery && (
            <button onClick={() => props.setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="mt-1">
          <SearchFilters filters={props.searchFilters} onChange={props.setSearchFilters} />
        </div>
      </div>

      {/* New page + New collection buttons */}
      <div className="px-3 pb-2 space-y-1">
        <button onClick={() => props.setTemplatePickerOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Plus className="h-3.5 w-3.5" /> New page
        </button>
        <button onClick={props.openCreateCol}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <FolderPlus className="h-3.5 w-3.5" /> New collection
        </button>
      </div>

      {/* Sidebar tree */}
      <SidebarTree
        collectionTree={props.collectionTree}
        pages={props.pages}
        pagesByCollection={props.pagesByCollection}
        collections={props.collections}
        favoritePages={props.favoritePages}
        searchQuery={props.searchQuery}
        loading={props.loading}
        isActive={props.isActive}
        expandedCollections={props.expandedCollections}
        toggleCollection={props.toggleCollection}
        openEditCol={props.openEditCol}
        openCreateCol={props.openCreateCol}
        openTemplates={props.openTemplates}
        loadTrashPage={props.loadTrashPage}
        dragPageId={props.dragPageId}
        dragColId={props.dragColId}
        dragOverTarget={props.dragOverTarget}
        handleDragStart={props.handleDragStart}
        handleColDragStart={props.handleColDragStart}
        handleDragOver={props.handleDragOver}
        handleDragLeave={props.handleDragLeave}
        handleDragEnd={props.handleDragEnd}
        handleDropOnCollection={props.handleDropOnCollection}
        handleDropOnPage={props.handleDropOnPage}
        setDragOverTarget={props.setDragOverTarget}
        selectedPageIds={props.selectedPageIds}
        togglePageSelection={props.togglePageSelection}
        clearSelection={props.clearSelection}
        handleBatchArchive={props.handleBatchArchive}
        handleBatchDelete={props.handleBatchDelete}
        handleBatchMove={props.handleBatchMove}
        handleBatchTag={props.handleBatchTag}
        handlePageClick={props.handlePageClick}
        setContextMenu={props.setContextMenu}
        pageLimits={props.pageLimits}
        setPageLimits={props.setPageLimits}
        setBatchMoveOpen={props.setBatchMoveOpen}
        setBatchTagOpen={props.setBatchTagOpen}
        batchMoveOpen={props.batchMoveOpen}
        batchTagOpen={props.batchTagOpen}
        batchTagName={props.batchTagName}
        setBatchTagName={props.setBatchTagName}
        batchTagValue={props.batchTagValue}
        setBatchTagValue={props.setBatchTagValue}
        navigate={props.navigate}
      />

      {/* Bottom nav */}
      <div className="px-3 py-2 border-t border-border space-y-1" ref={props.sidebarNavRef}>
        <button onClick={() => props.navigate('/activity')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <History className="h-3 w-3" /> Activity
        </button>
        <button onClick={() => props.navigate('/graph')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Share2 className="h-3 w-3" /> Graph
        </button>
        <button onClick={() => window.open('/docs', '_blank')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Code className="h-3 w-3" /> API Docs
        </button>
        <button onClick={props.openTemplates} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <LayoutTemplate className="h-3 w-3" /> Templates
        </button>
        <button onClick={props.loadTrashPage}
          onDragOver={(e) => { e.preventDefault(); props.setDragOverTarget("__trash__"); }}
          onDragLeave={() => props.setDragOverTarget(null)}
          onDrop={async (e) => {
            e.preventDefault();
            const pageId = e.dataTransfer.getData("text/plain") || props.dragPageId;
            if (pageId && pageId !== "__trash__") {
              if (!confirm("Move this page to trash?")) return;
              const { api } = await import("../lib/api");
              await api.pages.batchSetStatus([pageId], "deleted");
              props.setDragOverTarget(null);
              const { showToast } = await import("../components/Toast");
              showToast({ type: "success", title: "Page moved to trash", duration: 3000 });
            }
          }}
          className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
            props.dragOverTarget === "__trash__"
              ? "bg-red-500/10 text-red-400 border border-red-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
          <Trash2 className="h-3 w-3" /> Trash
        </button>
        <button onClick={() => props.navigate("/admin")} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Shield className="h-3 w-3" /> Admin
        </button>
        <button onClick={() => props.setAiAssistantOpen(true)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <MessageSquare className="h-3 w-3" /> AI Assistant
        </button>

        {/* Import buttons */}
        <input ref={props.importRef as any} type="file" accept=".md,.txt" onChange={props.handleImportMD} className="hidden" />
        <button onClick={() => props.importRef.current?.click()} disabled={props.importing}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
          {props.importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {props.importing ? "Importing..." : "Import MD"}
        </button>
        <input ref={props.notionImportRef as any} type="file" accept=".zip,.html,.htm" onChange={props.handleImportNotion} className="hidden" />
        <button onClick={() => props.notionImportRef.current?.click()} disabled={props.importingNotion}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
          {props.importingNotion ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
          {props.importingNotion ? "Importing..." : "Import Wiki"}
        </button>
        <input ref={props.confluenceImportRef as any} type="file" accept=".zip" onChange={props.handleImportConfluence} className="hidden" />
        <button onClick={() => props.confluenceImportRef.current?.click()} disabled={props.importingConfluence}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
          {props.importingConfluence ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          {props.importingConfluence ? "Importing..." : "Import Confluence"}
        </button>

        {/* Theme + Shortcuts */}
        <button onClick={() => props.setTheme(props.theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          {props.theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
          {props.theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button onClick={() => props.setShortcutsOpen(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <Keyboard className="h-3 w-3" /> Keyboard shortcuts
        </button>
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          {props.userId ? <span className="truncate">Logged in</span>
            : <button onClick={() => props.navigate("/login")} className="text-primary hover:underline">Sign in</button>}
        </div>
      </div>
    </aside>
  );
}
