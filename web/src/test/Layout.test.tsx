import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Hoisted mock data ─────────────────────────────────────────────────────────
const mockLayoutState = vi.hoisted(() => ({
  pages: [],
  collections: [],
  collectionTree: [],
  pagesByCollection: {},
  favoritePages: [],
  loading: false,
  searchQuery: '',
  setSearchQuery: vi.fn(),
  searchFilters: {},
  setSearchFilters: vi.fn(),
  handleSearchInput: vi.fn(),
  isActive: vi.fn(),
  navigate: vi.fn(),
  userId: 'u1',
  notificationList: [],
  refreshNotifications: vi.fn(),
  expandedCollections: new Set<string>(),
  toggleCollection: vi.fn(),
  openEditCol: vi.fn(),
  openCreateCol: vi.fn(),
  pageLimits: {},
  setPageLimits: vi.fn(),
  sidebarOpen: true,
  setSidebarOpen: vi.fn(),
  sidebarOverlayRef: { current: null },
  sidebarOverlayVisible: false,
  setSidebarOverlayVisible: vi.fn(),
  sidebarDragRef: { current: false },
  sidebarElRef: { current: null },
  touchStartRef: { current: 0 },
  sidebarTouchDelta: { current: 0 },
  SIDEBAR_W: 288,
  sidebarNavRef: { current: null },
  importRef: { current: null },
  notionImportRef: { current: null },
  confluenceImportRef: { current: null },
  importing: false,
  importingNotion: false,
  importingConfluence: false,
  dragPageId: null,
  dragColId: null,
  dragOverTarget: null,
  setDragOverTarget: vi.fn(),
  handleDragStart: vi.fn(),
  handleColDragStart: vi.fn(),
  handleDragOver: vi.fn(),
  handleDragLeave: vi.fn(),
  handleDragEnd: vi.fn(),
  handleDropOnCollection: vi.fn(),
  handleDropOnPage: vi.fn(),
  handlePageClick: vi.fn(),
  selectedPageIds: new Set<string>(),
  togglePageSelection: vi.fn(),
  clearSelection: vi.fn(),
  setBatchMoveOpen: vi.fn(),
  setBatchTagOpen: vi.fn(),
  batchMoveOpen: false,
  batchTagOpen: false,
  batchTagName: '',
  setBatchTagName: vi.fn(),
  batchTagValue: '',
  setBatchTagValue: vi.fn(),
  contextMenu: null as { x: number; y: number; colId?: string; pageId?: string } | null,
  setContextMenu: vi.fn(),
  openTemplates: vi.fn(),
  loadTrashPage: vi.fn(),
  setAiAssistantOpen: vi.fn(),
  setTemplatePickerOpen: vi.fn(),
  setShortcutsOpen: vi.fn(),
  theme: 'dark' as const,
  setTheme: vi.fn(),
  handleImportMD: vi.fn(),
  handleImportNotion: vi.fn(),
  handleImportConfluence: vi.fn(),
  location: { pathname: '/' },
  trashPages: [],
  trashLoading: false,
  restorePage: vi.fn(),
  permanentDelete: vi.fn(),
  emptyTrash: vi.fn(),
  allUsers: [],
  setAllUsers: vi.fn(),
  shareDialog: null as { pageTitle: string; pageId: string } | null,
  sharePassword: '',
  setSharePassword: vi.fn(),
  shareDays: 7,
  setShareDays: vi.fn(),
  shareUrl: '',
  shareLinks: [],
  createShare: vi.fn(),
  deleteShare: vi.fn(),
  editBrandShareId: null as string | null,
  setEditBrandShareId: vi.fn(),
  editBrandTitle: '',
  setEditBrandTitle: vi.fn(),
  editBrandLogoUrl: '',
  setEditBrandLogoUrl: vi.fn(),
  updateShareBranding: vi.fn(),
  setShareDialog: vi.fn(),
  templateModalOpen: false,
  setTemplateModalOpen: vi.fn(),
  templates: [],
  selectedTemplate: '',
  setSelectedTemplate: vi.fn(),
  newPageTitle: '',
  setNewPageTitle: vi.fn(),
  createFromTemplate: vi.fn(),
  colDialogOpen: false,
  setColDialogOpen: vi.fn(),
  editingCol: null as {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
  } | null,
  colName: '',
  setColName: vi.fn(),
  colDesc: '',
  setColDesc: vi.fn(),
  colIcon: '',
  setColIcon: vi.fn(),
  colColor: '',
  setColColor: vi.fn(),
  colSortMode: 'manual',
  setColSortMode: vi.fn(),
  colAutoApply: false,
  setColAutoApply: vi.fn(),
  saveCollection: vi.fn(),
  paletteOpen: false,
  paletteQuery: '',
  setPaletteQuery: vi.fn(),
  paletteIndex: 0,
  paletteItems: [],
  executePalette: vi.fn(),
  closePalette: vi.fn(),
  templatePickerOpen: false,
  shortcutsOpen: false,
  aiAssistantOpen: false,
  currentPageId: null,
  currentPageTitle: '',
  handleDuplicatePage: vi.fn(),
  handleExportPageMD: vi.fn(),
  handleExportPageHTML: vi.fn(),
  deleteCollection: vi.fn(),
  refreshData: vi.fn(),
}));

vi.mock('../hooks/useAppLayout', () => ({
  useAppLayout: () => mockLayoutState,
}));

vi.mock('../components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('../components/AiAssistant', () => ({
  AiAssistant: () => <div data-testid="ai-assistant">AI</div>,
}));

vi.mock('../components/KeyboardShortcuts', () => ({
  KeyboardShortcuts: () => <div data-testid="shortcuts">Shortcuts</div>,
}));

vi.mock('../components/TemplatePicker', () => ({
  TemplatePicker: () => <div data-testid="template-picker">Picker</div>,
}));

vi.mock('../components/admin/AdminPanels', () => ({
  AdminPanels: () => <div data-testid="admin-panels">Admin</div>,
}));

vi.mock('../components/TrashDialog', () => ({
  TrashDialog: () => <div data-testid="trash-dialog">Trash</div>,
}));

vi.mock('../components/ShareDialog', () => ({
  ShareDialog: () => <div data-testid="share-dialog">Share</div>,
}));

vi.mock('../components/CollectionDialog', () => ({
  CollectionDialog: () => <div data-testid="collection-dialog">Collection</div>,
}));

vi.mock('../components/TemplateModal', () => ({
  TemplateModal: () => <div data-testid="template-modal">Template Modal</div>,
}));

vi.mock('../components/CommandPalette', () => ({
  CommandPalette: () => <div data-testid="command-palette">Palette</div>,
}));

vi.mock('../components/PageContextMenu', () => ({
  PageContextMenu: () => <div data-testid="context-menu">Context</div>,
}));

vi.mock('../routes', () => ({
  AppLayoutRoutes: () => <div data-testid="routes">Routes</div>,
}));

import { Layout } from '../components/Layout';

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state
    mockLayoutState.contextMenu = null;
    mockLayoutState.shareDialog = null;
    mockLayoutState.aiAssistantOpen = false;
    mockLayoutState.userId = 'u1';
    mockLayoutState.location.pathname = '/';
  });

  it('renders sidebar and main content', () => {
    render(<Layout />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('routes')).toBeInTheDocument();
  });

  it('renders admin panels', () => {
    render(<Layout />);
    expect(screen.getByTestId('admin-panels')).toBeInTheDocument();
  });

  it('renders template picker and keyboard shortcuts', () => {
    render(<Layout />);
    expect(screen.getByTestId('template-picker')).toBeInTheDocument();
    expect(screen.getByTestId('shortcuts')).toBeInTheDocument();
  });

  it('renders collection dialog and command palette', () => {
    render(<Layout />);
    expect(screen.getByTestId('collection-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('renders template modal', () => {
    render(<Layout />);
    expect(screen.getByTestId('template-modal')).toBeInTheDocument();
  });

  it('shows trash dialog on /trash path', () => {
    mockLayoutState.location.pathname = '/trash';
    render(<Layout />);
    expect(screen.getByTestId('trash-dialog')).toBeInTheDocument();
  });

  it('does not show trash dialog on non-trash path', () => {
    render(<Layout />);
    expect(screen.queryByTestId('trash-dialog')).not.toBeInTheDocument();
  });

  it('shows share dialog when shareDialog is set', () => {
    mockLayoutState.shareDialog = { pageTitle: 'Test', pageId: 'p1' };
    render(<Layout />);
    expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
  });

  it('does not show share dialog when shareDialog is null', () => {
    render(<Layout />);
    expect(screen.queryByTestId('share-dialog')).not.toBeInTheDocument();
  });

  it('shows context menu when contextMenu is set', () => {
    mockLayoutState.contextMenu = { x: 100, y: 200, pageId: 'p1' };
    render(<Layout />);
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
  });

  it('shows AI assistant when aiAssistantOpen and userId set', () => {
    mockLayoutState.aiAssistantOpen = true;
    render(<Layout />);
    expect(screen.getByTestId('ai-assistant')).toBeInTheDocument();
  });

  it('does not show AI assistant when userId is null', () => {
    mockLayoutState.aiAssistantOpen = true;
    mockLayoutState.userId = null;
    render(<Layout />);
    expect(screen.queryByTestId('ai-assistant')).not.toBeInTheDocument();
  });
});
