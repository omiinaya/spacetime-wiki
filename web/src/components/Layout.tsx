import { Library, Menu } from "lucide-react";
import { AiAssistant } from "./AiAssistant";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { TemplatePicker } from "./TemplatePicker";
import { AdminPanels } from "./admin/AdminPanels";
import { Sidebar } from "./Sidebar";
import { TrashDialog } from "./TrashDialog";
import { ShareDialog } from "./ShareDialog";
import { CollectionDialog } from "./CollectionDialog";
import { TemplateModal } from "./TemplateModal";
import { CommandPalette } from "./CommandPalette";
import { PageContextMenu } from "./PageContextMenu";
import { useAppLayout } from "../hooks/useAppLayout";
import { AppLayoutRoutes } from "../routes";

export function Layout() {
  const s = useAppLayout();

  return (
    <div
      className="flex h-screen bg-background"
      onClick={() => s.setContextMenu(null)}
    >
      {/* Sidebar */}
      <Sidebar
        pages={s.pages}
        collections={s.collections}
        collectionTree={s.collectionTree}
        pagesByCollection={s.pagesByCollection}
        favoritePages={s.favoritePages}
        loading={s.loading}
        searchQuery={s.searchQuery}
        setSearchQuery={s.setSearchQuery}
        searchFilters={s.searchFilters}
        setSearchFilters={s.setSearchFilters}
        handleSearchInput={s.handleSearchInput}
        isActive={s.isActive}
        navigate={s.navigate}
        userId={s.userId}
        notificationList={s.notificationList}
        refreshNotifications={s.refreshNotifications}
        expandedCollections={s.expandedCollections}
        toggleCollection={s.toggleCollection}
        openEditCol={s.openEditCol}
        openCreateCol={s.openCreateCol}
        pageLimits={s.pageLimits}
        setPageLimits={s.setPageLimits}
        sidebarOpen={s.sidebarOpen}
        setSidebarOpen={s.setSidebarOpen}
        sidebarNavRef={s.sidebarNavRef}
        sidebarElRef={s.sidebarElRef}
        sidebarOverlayRef={s.sidebarOverlayRef}
        sidebarOverlayVisible={s.sidebarOverlayVisible}
        setSidebarOverlayVisible={s.setSidebarOverlayVisible}
        sidebarDragRef={s.sidebarDragRef}
        touchStartRef={s.touchStartRef}
        sidebarTouchDelta={s.sidebarTouchDelta}
        SIDEBAR_W={s.SIDEBAR_W}
        importRef={s.importRef}
        notionImportRef={s.notionImportRef}
        confluenceImportRef={s.confluenceImportRef}
        importing={s.importing}
        importingNotion={s.importingNotion}
        importingConfluence={s.importingConfluence}
        dragPageId={s.dragPageId}
        dragColId={s.dragColId}
        dragOverTarget={s.dragOverTarget}
        setDragOverTarget={s.setDragOverTarget}
        handleDragStart={s.handleDragStart}
        handleColDragStart={s.handleColDragStart}
        handleDragOver={s.handleDragOver}
        handleDragLeave={s.handleDragLeave}
        handleDragEnd={s.handleDragEnd}
        handleDropOnCollection={s.handleDropOnCollection}
        handleDropOnPage={s.handleDropOnPage}
        selectedPageIds={s.selectedPageIds}
        togglePageSelection={s.togglePageSelection}
        clearSelection={s.clearSelection}
        handlePageClick={s.handlePageClick}
        handleBatchArchive={s.handleBatchArchive}
        handleBatchDelete={s.handleBatchDelete}
        handleBatchMove={s.handleBatchMove}
        handleBatchTag={s.handleBatchTag}
        setBatchMoveOpen={s.setBatchMoveOpen}
        setBatchTagOpen={s.setBatchTagOpen}
        batchMoveOpen={s.batchMoveOpen}
        batchTagOpen={s.batchTagOpen}
        batchTagName={s.batchTagName}
        setBatchTagName={s.setBatchTagName}
        batchTagValue={s.batchTagValue}
        setBatchTagValue={s.setBatchTagValue}
        setContextMenu={s.setContextMenu}
        openTemplates={s.openTemplates}
        loadTrashPage={s.loadTrashPage}
        setAiAssistantOpen={s.setAiAssistantOpen}
        setTemplatePickerOpen={s.setTemplatePickerOpen}
        setShortcutsOpen={s.setShortcutsOpen}
        theme={s.theme}
        setTheme={s.setTheme}
        handleImportMD={s.handleImportMD}
        handleImportNotion={s.handleImportNotion}
        handleImportConfluence={s.handleImportConfluence}
      />

      {/* Sidebar overlay (mobile) */}
      {(s.sidebarOpen || s.sidebarOverlayVisible) && (
        <div
          ref={s.sidebarOverlayRef}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden transition-opacity duration-300"
          style={{
            opacity:
              s.sidebarOpen && !s.sidebarDragRef.current ? 1 : undefined,
          }}
          onClick={() => {
            s.setSidebarOpen(false);
            s.setSidebarOverlayVisible(false);
          }}
        />
      )}

      {/* Context menu */}
      {s.contextMenu && (
        <PageContextMenu
          contextMenu={s.contextMenu}
          onClose={() => s.setContextMenu(null)}
          pages={s.pages}
          collections={s.collections}
          navigate={s.navigate}
          onDuplicate={s.handleDuplicatePage}
          onExportMD={s.handleExportPageMD}
          onExportHTML={s.handleExportPageHTML}
          onEditCol={s.openEditCol}
          onDeleteCol={s.deleteCollection}
          onDeletePage={async (pageId) => {
            if (!confirm("Move this page to trash?")) return;
            const { api } = await import("../lib/api");
            await api.pages.batchSetStatus([pageId], "deleted");
            s.refreshData();
            const { showToast } = await import("../components/Toast");
            showToast({
              type: "success",
              title: "Page moved to trash",
              duration: 3000,
            });
          }}
        />
      )}

      {/* Trash panel */}
      {s.location.pathname === "/trash" && (
        <TrashDialog
          trashPages={s.trashPages}
          trashLoading={s.trashLoading}
          onClose={() => s.navigate("/")}
          onRestore={s.restorePage}
          onPermanentDelete={s.permanentDelete}
          onEmptyTrash={s.emptyTrash}
        />
      )}

      {/* Admin panels */}
      <AdminPanels
        userId={s.userId ?? ""}
        allUsers={s.allUsers}
        setAllUsers={s.setAllUsers}
      />

      {/* Share dialog */}
      {s.shareDialog && (
        <ShareDialog
          pageTitle={s.shareDialog.pageTitle}
          sharePassword={s.sharePassword}
          onPasswordChange={s.setSharePassword}
          shareDays={s.shareDays}
          onDaysChange={s.setShareDays}
          shareUrl={s.shareUrl}
          shareLinks={s.shareLinks}
          onCreateShare={s.createShare}
          onDeleteShare={s.deleteShare}
          editBrandShareId={s.editBrandShareId}
          onEditBrandShareId={s.setEditBrandShareId}
          editBrandTitle={s.editBrandTitle}
          onEditBrandTitle={s.setEditBrandTitle}
          editBrandLogoUrl={s.editBrandLogoUrl}
          onEditBrandLogoUrl={s.setEditBrandLogoUrl}
          onUpdateBranding={s.updateShareBranding}
          onClose={() => s.setShareDialog(null)}
        />
      )}

      {/* Template modal (from sidebar new page button) */}
      <TemplateModal
        open={s.templateModalOpen}
        onClose={() => s.setTemplateModalOpen(false)}
        templates={s.templates}
        selectedTemplate={s.selectedTemplate}
        onSelectTemplate={(id, title) => {
          s.setSelectedTemplate(id);
          s.setNewPageTitle(title);
        }}
        newPageTitle={s.newPageTitle}
        onNewPageTitleChange={s.setNewPageTitle}
        onCreateFromTemplate={s.createFromTemplate}
        createDisabled={!s.selectedTemplate || !s.newPageTitle.trim()}
      />

      {/* Collection dialog */}
      <CollectionDialog
        open={s.colDialogOpen}
        onClose={() => s.setColDialogOpen(false)}
        editingCol={s.editingCol}
        colName={s.colName}
        onColNameChange={s.setColName}
        colDesc={s.colDesc}
        onColDescChange={s.setColDesc}
        colIcon={s.colIcon}
        onColIconChange={s.setColIcon}
        colColor={s.colColor}
        onColColorChange={s.setColColor}
        colSortMode={s.colSortMode}
        onColSortModeChange={s.setColSortMode}
        colAutoApply={s.colAutoApply}
        onColAutoApplyChange={s.setColAutoApply}
        onSave={s.saveCollection}
        saveDisabled={!s.colName.trim()}
      />

      {/* Main content */}
      <main
        className="flex-1 overflow-y-auto"
        onTouchStart={(e) => {
          if (
            !s.sidebarOpen &&
            s.sidebarElRef.current &&
            e.touches[0].clientX < 30
          ) {
            s.touchStartRef.current = e.touches[0].clientX;
            s.sidebarDragRef.current = true;
            s.sidebarTouchDelta.current = 0;
            const el = s.sidebarElRef.current;
            el.style.transition = "none";
          }
        }}
        onTouchMove={(e) => {
          if (!s.sidebarDragRef.current) return;
          const dx = e.touches[0].clientX - s.touchStartRef.current;
          s.sidebarTouchDelta.current = dx;
          const el = s.sidebarElRef.current;
          if (!el) return;
          el.style.transition = "none";
          if (!s.sidebarOpen && dx > 0) {
            const offset = Math.min(dx, s.SIDEBAR_W);
            el.style.transform = `translateX(${offset - s.SIDEBAR_W}px)`;
            const progress = offset / s.SIDEBAR_W;
            if (progress > 0.05 && !s.sidebarOverlayVisible)
              s.setSidebarOverlayVisible(true);
            const ov = s.sidebarOverlayRef.current;
            if (ov) ov.style.opacity = String(progress * 0.6);
          } else if (s.sidebarOpen && dx < 0) {
            const offset = Math.max(dx, -s.SIDEBAR_W);
            el.style.transform = `translateX(${offset}px)`;
            const progress = Math.abs(dx) / s.SIDEBAR_W;
            const ov = s.sidebarOverlayRef.current;
            if (ov) ov.style.opacity = String((1 - progress) * 0.6);
          }
        }}
        onTouchEnd={() => {
          if (!s.sidebarDragRef.current) return;
          if (!s.sidebarOpen && s.sidebarTouchDelta.current > 60) {
            s.setSidebarOpen(true);
            s.setSidebarOverlayVisible(true);
          }
          s.sidebarDragRef.current = false;
          const el = s.sidebarElRef.current;
          if (el) {
            el.style.transition = "";
            el.style.transform = "";
          }
          s.sidebarTouchDelta.current = 0;
        }}
      >
        <div className="md:hidden flex items-center gap-2 px-4 h-14 border-b border-border">
          <button onClick={() => s.setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="w-6 h-6 rounded-md bg-linear-to-br from-primary to-purple-600 flex items-center justify-center">
            <Library className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold text-sm">Spacetime Wiki</span>
        </div>

        <AppLayoutRoutes userId={s.userId} />
      </main>

      {/* Command palette */}
      <CommandPalette
        open={s.paletteOpen}
        query={s.paletteQuery}
        onQueryChange={(v) => {
          s.setPaletteQuery(v);
          s.setPaletteIndex(0);
        }}
        index={s.paletteIndex}
        items={s.paletteItems}
        onExecute={s.executePalette}
        onClose={s.closePalette}
      />

      {/* Template picker (new page flow) */}
      <TemplatePicker
        open={s.templatePickerOpen}
        onClose={() => s.setTemplatePickerOpen(false)}
        collections={s.collections}
        userId={s.userId}
        navigate={s.navigate}
      />

      <KeyboardShortcuts
        open={s.shortcutsOpen}
        onClose={() => s.setShortcutsOpen(false)}
      />

      {s.aiAssistantOpen && s.userId && (
        <AiAssistant
          userId={s.userId}
          currentPageId={s.currentPageId}
          currentPageTitle={s.currentPageTitle}
          onClose={() => s.setAiAssistantOpen(false)}
        />
      )}
    </div>
  );
}
