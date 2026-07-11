import { useState, useMemo } from 'react';
import React from 'react';
import {
  FileText,
  BookOpen,
  Plus,
  FolderPlus,
  LayoutTemplate,
  Shield,
  Trash2,
  Star,
  History,
  Share2,
  Code,
  Keyboard,
  Sun,
  Moon,
} from 'lucide-react';
import { Page, Collection } from '../lib/api';

export function useCommandPalette(
  pages: Page[],
  collections: Collection[],
  navigate: (path: string) => void,
  theme: 'dark' | 'light',
  openCreateCol: () => void,
  toggleCollection: (id: string) => void,
  closePalette: () => void,
  setTemplatePickerOpen: (open: boolean) => void,
  setShortcutsOpen: (open: boolean) => void,
  setTheme: (t: 'dark' | 'light') => void,
) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);

  const collectionLabel = (colId: string) => collections.find((c) => c.id === colId)?.name || '';

  const paletteItems = useMemo(() => {
    const q = paletteQuery.toLowerCase();
    const results: {
      type: 'page' | 'collection' | 'action';
      id?: string;
      label: string;
      subtitle: string;
      icon: React.ReactNode;
      action: () => void;
      shortcut?: string;
    }[] = [];

    // Pages
    for (const p of pages.filter(
      (x) => x.status !== 'deleted' && (x.title.toLowerCase().includes(q) || q === ''),
    )) {
      results.push({
        type: 'page',
        id: p.id,
        label: p.title,
        subtitle:
          `${p.status === 'draft' ? 'Draft' : p.status === 'archived' ? 'Archived' : ''} ${collectionLabel(p.collection_id)}`.trim(),
        icon: <FileText className="h-4 w-4" />,
        action: () => navigate(`/page/${p.id}`),
      });
    }

    // Collections
    for (const c of collections.filter((x) => x.name.toLowerCase().includes(q))) {
      results.push({
        type: 'collection',
        id: c.id,
        label: c.name,
        subtitle: `${c.icon || '📁'} Collection`,
        icon: <BookOpen className="h-4 w-4" />,
        action: () => {
          navigate('/');
          toggleCollection(c.id);
        },
      });
    }

    // Actions
    const actions = [
      {
        label: 'New page',
        subtitle: 'Create a new document',
        icon: <Plus className="h-4 w-4" />,
        shortcut: 'N',
        action: () => {
          closePalette();
          navigate('/new');
        },
      },
      {
        label: 'New collection',
        subtitle: 'Create a new collection',
        icon: <FolderPlus className="h-4 w-4" />,
        shortcut: 'C',
        action: () => {
          closePalette();
          openCreateCol();
        },
      },
      {
        label: 'New template',
        subtitle: 'Save current page as a template',
        icon: <LayoutTemplate className="h-4 w-4" />,
        shortcut: 'T',
        action: () => {
          closePalette();
          setTemplatePickerOpen(true);
        },
      },
      {
        label: 'Admin panel',
        subtitle: 'Manage users, groups, settings',
        icon: <Shield className="h-4 w-4" />,
        shortcut: 'A',
        action: () => {
          closePalette();
          navigate('/admin');
        },
      },
      {
        label: 'Trash',
        subtitle: 'View deleted pages',
        icon: <Trash2 className="h-4 w-4" />,
        shortcut: 'G T',
        action: () => {
          closePalette();
          navigate('/trash');
        },
      },
      {
        label: 'Favorites',
        subtitle: 'Show starred pages',
        icon: <Star className="h-4 w-4" />,
        shortcut: 'G F',
        action: () => {
          closePalette();
          navigate('/favorites');
        },
      },
      {
        label: 'Activity',
        subtitle: 'View recent wiki activity',
        icon: <History className="h-4 w-4" />,
        shortcut: 'G A',
        action: () => {
          closePalette();
          navigate('/activity');
        },
      },
      {
        label: 'Graph view',
        subtitle: 'Visualize page relationships',
        icon: <Share2 className="h-4 w-4" />,
        shortcut: 'G G',
        action: () => {
          closePalette();
          navigate('/graph');
        },
      },
      {
        label: 'API Docs',
        subtitle: 'Open API documentation (Swagger UI)',
        icon: <Code className="h-4 w-4" />,
        action: () => {
          closePalette();
          window.open('/docs', '_blank');
        },
      },
      {
        label: 'Keyboard shortcuts',
        subtitle: 'View all keyboard shortcuts',
        icon: <Keyboard className="h-4 w-4" />,
        shortcut: '?',
        action: () => {
          closePalette();
          setShortcutsOpen(true);
        },
      },
      {
        label: 'Toggle dark mode',
        subtitle: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
        icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        shortcut: 'D',
        action: () => {
          closePalette();
          setTheme(theme === 'dark' ? 'light' : 'dark');
        },
      },
    ];
    for (const a of actions) {
      if (a.label.toLowerCase().includes(q) || q === '')
        results.push({
          type: 'action' as const,
          label: a.label,
          subtitle: a.subtitle,
          icon: a.icon,
          action: a.action,
        });
    }
    return results.slice(0, 15);
  }, [
    paletteQuery,
    pages,
    collections,
    navigate,
    theme,
    openCreateCol,
    toggleCollection,
    closePalette,
    setTemplatePickerOpen,
    setShortcutsOpen,
    setTheme,
  ]);

  const executePalette = (idx: number) => {
    const item = paletteItems[idx];
    if (item) {
      closePalette();
      item.action();
    }
  };

  return {
    paletteOpen,
    setPaletteOpen,
    paletteQuery,
    setPaletteQuery,
    paletteIndex,
    setPaletteIndex,
    paletteItems,
    closePalette,
    executePalette,
    collectionLabel,
  };
}
