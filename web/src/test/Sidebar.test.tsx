import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../components/Sidebar';
import type { SearchFilterState } from '../components/SearchFilters';

// ─── Hoisted mock data ─────────────────────────────────────────────────────────
const defaultProps = vi.hoisted(() => ({
  pages: [],
  collections: [],
  collectionTree: [],
  pagesByCollection: {},
  favoritePages: [],
  loading: false,
  searchQuery: '',
  setSearchQuery: vi.fn(),
  searchFilters: {} as SearchFilterState,
  setSearchFilters: vi.fn(),
  handleSearchInput: vi.fn(),
  isActive: vi.fn(),
  navigate: vi.fn(),
  userId: 'u1' as string | null,
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
  setContextMenu: vi.fn(),
  openTemplates: vi.fn(),
  loadTrashPage: vi.fn(),
  setAiAssistantOpen: vi.fn(),
  setTemplatePickerOpen: vi.fn(),
  setShortcutsOpen: vi.fn(),
  theme: 'dark' as 'dark' | 'light',
  setTheme: vi.fn(),
  handleImportMD: vi.fn(),
  handleImportNotion: vi.fn(),
  handleImportConfluence: vi.fn(),
  handleBatchArchive: vi.fn(),
  handleBatchDelete: vi.fn(),
  handleBatchMove: vi.fn(),
  handleBatchTag: vi.fn(),
  setBatchMoveOpen: vi.fn(),
  setBatchTagOpen: vi.fn(),
  batchMoveOpen: false,
  batchTagOpen: false,
  batchTagName: '',
  setBatchTagName: vi.fn(),
  batchTagValue: '',
  setBatchTagValue: vi.fn(),
}));

vi.mock('../components/SidebarTree', () => ({
  SidebarTree: () => <div data-testid="sidebar-tree">Tree</div>,
}));

vi.mock('../components/SearchFilters', () => ({
  SearchFilters: () => <div data-testid="search-filters">Filters</div>,
}));

vi.mock('../components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
}));

vi.mock('lucide-react', () => {
  const Icon = () => <span data-testid="mock-icon" />;
  return {
    Search: Icon,
    Plus: Icon,
    FolderPlus: Icon,
    Library: Icon,
    X: Icon,
    History: Icon,
    Share2: Icon,
    Code: Icon,
    LayoutTemplate: Icon,
    Trash2: Icon,
    Shield: Icon,
    MessageSquare: Icon,
    Upload: Icon,
    Package: Icon,
    Download: Icon,
    Sun: Icon,
    Moon: Icon,
    Keyboard: Icon,
    Loader2: Icon,
    Menu: Icon,
  };
});

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.userId = 'u1';
    defaultProps.searchQuery = '';
    defaultProps.theme = 'dark';
    defaultProps.dragOverTarget = null;
  });

  it('renders the app title', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Spacetime Wiki')).toBeInTheDocument();
  });

  it('renders notification bell', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders search filters', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTestId('search-filters')).toBeInTheDocument();
  });

  it('renders New page and New collection buttons', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('New page')).toBeInTheDocument();
    expect(screen.getByText('New collection')).toBeInTheDocument();
  });

  it('opens template picker on New page click', () => {
    const setTemplatePickerOpen = vi.fn();
    render(<Sidebar {...defaultProps} setTemplatePickerOpen={setTemplatePickerOpen} />);
    fireEvent.click(screen.getByText('New page'));
    expect(setTemplatePickerOpen).toHaveBeenCalledWith(true);
  });

  it('opens create collection dialog on New collection click', () => {
    const openCreateCol = vi.fn();
    render(<Sidebar {...defaultProps} openCreateCol={openCreateCol} />);
    fireEvent.click(screen.getByText('New collection'));
    expect(openCreateCol).toHaveBeenCalled();
  });

  it('renders sidebar tree', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTestId('sidebar-tree')).toBeInTheDocument();
  });

  it('renders bottom nav buttons', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Graph')).toBeInTheDocument();
    expect(screen.getByText('API Docs')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Trash')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('navigates on Activity click', () => {
    const navigate = vi.fn();
    render(<Sidebar {...defaultProps} navigate={navigate} />);
    fireEvent.click(screen.getByText('Activity'));
    expect(navigate).toHaveBeenCalledWith('/activity');
  });

  it('navigates on Graph click', () => {
    const navigate = vi.fn();
    render(<Sidebar {...defaultProps} navigate={navigate} />);
    fireEvent.click(screen.getByText('Graph'));
    expect(navigate).toHaveBeenCalledWith('/graph');
  });

  it('opens template picker', () => {
    const setTemplatePickerOpen = vi.fn();
    render(<Sidebar {...defaultProps} setTemplatePickerOpen={setTemplatePickerOpen} />);
    fireEvent.click(screen.getByText('Templates'));
  });

  it('loads trash page on Trash click', () => {
    const loadTrashPage = vi.fn();
    render(<Sidebar {...defaultProps} loadTrashPage={loadTrashPage} />);
    fireEvent.click(screen.getByText('Trash'));
    expect(loadTrashPage).toHaveBeenCalled();
  });

  it('navigates to admin on Admin click', () => {
    const navigate = vi.fn();
    render(<Sidebar {...defaultProps} navigate={navigate} />);
    fireEvent.click(screen.getByText('Admin'));
    expect(navigate).toHaveBeenCalledWith('/admin');
  });

  it('opens AI assistant', () => {
    const setAiAssistantOpen = vi.fn();
    render(<Sidebar {...defaultProps} setAiAssistantOpen={setAiAssistantOpen} />);
    fireEvent.click(screen.getByText('AI Assistant'));
    expect(setAiAssistantOpen).toHaveBeenCalledWith(true);
  });

  it('renders import buttons', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Import MD')).toBeInTheDocument();
    expect(screen.getByText('Import Wiki')).toBeInTheDocument();
    expect(screen.getByText('Import Confluence')).toBeInTheDocument();
  });

  it('shows importing state on import buttons', () => {
    render(<Sidebar {...defaultProps} importing={true} />);
    expect(screen.getByText('Importing...')).toBeInTheDocument();
  });

  it('toggles theme on theme button click', () => {
    const setTheme = vi.fn();
    render(<Sidebar {...defaultProps} setTheme={setTheme} />);
    fireEvent.click(screen.getByText('Light mode'));
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('shows Dark mode label when theme is light', () => {
    render(<Sidebar {...defaultProps} theme="light" />);
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('opens keyboard shortcuts', () => {
    const setShortcutsOpen = vi.fn();
    render(<Sidebar {...defaultProps} setShortcutsOpen={setShortcutsOpen} />);
    fireEvent.click(screen.getByText('Keyboard shortcuts'));
    expect(setShortcutsOpen).toHaveBeenCalledWith(true);
  });

  it('shows Logged in when userId is present', () => {
    render(<Sidebar {...defaultProps} userId="u1" />);
    expect(screen.getByText('Logged in')).toBeInTheDocument();
  });

  it('shows Sign in when userId is null', () => {
    render(<Sidebar {...defaultProps} userId={null} />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('navigates to /login on Sign in click', () => {
    const navigate = vi.fn();
    render(<Sidebar {...defaultProps} userId={null} navigate={navigate} />);
    fireEvent.click(screen.getByText('Sign in'));
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('shows clear search button when searchQuery has value', () => {
    const setSearchQuery = vi.fn();
    const { container } = render(<Sidebar {...defaultProps} searchQuery="test" setSearchQuery={setSearchQuery} />);
    // Find the clear button inside the search container (has "right-2" class)
    const clearBtns = container.querySelectorAll('.absolute.right-2');
    expect(clearBtns.length).toBeGreaterThan(0);
    fireEvent.click(clearBtns[0]);
    expect(setSearchQuery).toHaveBeenCalledWith('');
  });
});
