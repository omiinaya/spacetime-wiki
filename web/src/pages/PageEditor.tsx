import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent, Editor } from '@tiptap/react';

import { createPortal } from 'react-dom';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { ImageEnhanced } from '../extensions/ImageEnhanced';
import { HeadingWithId } from '../extensions/HeadingWithId';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Typography from '@tiptap/extension-typography';
import { Details } from '../extensions/Details';
import { Callout, CALLOUT_TYPES } from '../extensions/Callout';
import { Mention } from '../extensions/Mention';
import { DragHandle } from '../extensions/DragHandle';
import { Mermaid } from '../extensions/Mermaid';
import { MathInline, MathBlock } from '../extensions/Math';
import { VideoEmbed, detectProvider } from '../extensions/VideoEmbed';
import { RichEmbed, detectEmbedProvider } from '../extensions/RichEmbed';
import { Drawio } from '../extensions/Drawio';
import { PlantUML } from '../extensions/PlantUML';
import { DatabaseBase } from '../extensions/DatabaseBase';
import { SyncedBlockExtension } from '../extensions/SyncedBlock';
const ImageLightbox = React.lazy(() => import('../components/ImageLightbox'));
import { common, createLowlight } from 'lowlight';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Eye,
  Save,
  ArrowLeft,
  Trash2,
  Archive,
  Copy,
  Loader2,
  Highlighter,
  X,
  ChevronDown,
  Maximize2,
  Palette,
  Code2,
  // Table toolbar icons
  Plus,
  TableCellsMerge,
  TableCellsSplit,
  TableProperties,
  Columns3,
  Rows3,
} from 'lucide-react';
import {
  api,
  Page,
  readFileAsBase64,
  resolveContentAttachments,
  isAttachmentUrl,
  MAX_IMAGE_BYTES,
} from '../lib/api';
import { showToast } from '../components/Toast';
import { useCollaboration } from '../lib/useCollaboration';
import { cn } from '../lib/utils';
import {
  tiptapToMarkdown as typedTiptapToMarkdown,
  markdownToProseMirror as typedMarkdownToProseMirror,
} from '../lib/helpers';
import type { PMNode } from '../lib/prosemirror-types';

const lowlight = createLowlight(common);

// ─── Slash command items ─────────────────────────────────────────────────────
// Keyboard handler in the editor detects "/" and shows a dropdown.
// No tippy/ReactRenderer dependency — just portals + DOM coordinates.

const SLASH_COMMANDS: {
  title: string;
  description: string;
  icon: string;
  command: (e: Editor) => void;
}[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    command: (e) => e?.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    command: (e) => e?.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    command: (e) => e?.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list',
    icon: '•',
    command: (e) => e?.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: '1.',
    command: (e) => e?.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Task List',
    description: 'Track tasks with checkboxes',
    icon: '☑',
    command: (e) => e?.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Blockquote',
    description: 'Capture a quote',
    icon: '❝',
    command: (e) => e?.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Capture a code snippet',
    icon: '</>',
    command: (e) => e?.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Table',
    description: 'Add a table',
    icon: '⊞',
    command: (e) => e?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image',
    description: 'Insert an image',
    icon: '🖼',
    command: (e) => {
      const url = prompt('Image URL:');
      if (url) e?.chain().focus().setImageEnhanced({ src: url }).run();
    },
  },
  {
    title: 'Divider',
    description: 'Insert a horizontal divider',
    icon: '—',
    command: (e) => e?.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Toggle',
    description: 'Collapsible toggle block',
    icon: '▶',
    command: (e) => e?.chain().focus().toggleDetails().run(),
  },
  {
    title: 'Info Callout',
    description: 'Blue info notice block',
    icon: 'ℹ️',
    command: (e) => e?.chain().focus().toggleCallout('info').run(),
  },
  {
    title: 'Warning Callout',
    description: 'Amber warning notice block',
    icon: '⚠️',
    command: (e) => e?.chain().focus().toggleCallout('warning').run(),
  },
  {
    title: 'Tip Callout',
    description: 'Green tip notice block',
    icon: '💡',
    command: (e) => e?.chain().focus().toggleCallout('tip').run(),
  },
  {
    title: 'Danger Callout',
    description: 'Red danger notice block',
    icon: '🚨',
    command: (e) => e?.chain().focus().toggleCallout('danger').run(),
  },
  {
    title: 'Diagram',
    description: 'Insert a Mermaid diagram',
    icon: '📊',
    command: (e) =>
      e
        ?.chain()
        .focus()
        .setMermaid({ src: 'graph TD\\n  A[Start] --> B[Process]\\n  B --> C[End]' })
        .run(),
  },
  {
    title: 'Math Block',
    description: 'Insert LaTeX math (KaTeX)',
    icon: '∑',
    command: (e) => e?.chain().focus().setMathBlock({ tex: 'E = mc^2' }).run(),
  },
  {
    title: 'Video',
    description: 'Insert a video embed (YouTube, Vimeo, Loom)',
    icon: '🎬',
    command: (e) => {
      const url = prompt('Video URL:');
      if (url) e?.chain().focus().setVideoEmbed({ src: url }).run();
    },
  },
  {
    title: 'Embed',
    description: 'Embed content from 30+ providers (Figma, CodePen, Spotify, Google Docs...)',
    icon: '🔗',
    command: (e) => {
      const url = prompt('Embed URL:');
      if (url) e?.chain().focus().setRichEmbed({ src: url }).run();
    },
  },
  {
    title: 'Draw.io',
    description: 'Insert a draw.io diagram',
    icon: '📐',
    command: (e) => e?.chain().focus().setDrawio({ src: '' }).run(),
  },
  {
    title: 'PlantUML',
    description: 'Insert a PlantUML diagram',
    icon: '🌿',
    command: (e) =>
      e
        ?.chain()
        .focus()
        .setPlantUML({ src: '@startuml\\nAlice -> Bob: Hello\\nBob -> Alice: Hi!\\n@enduml' })
        .run(),
  },
  {
    title: 'Database',
    description: 'Insert a table/kanban database view',
    icon: '🗄️',
    command: (e) =>
      e
        ?.chain()
        .focus()
        .setDatabaseBase({ baseId: prompt('Database Base ID:') || '' })
        .run(),
  },
  {
    title: 'Synced Block',
    description: 'Insert a reusable synced block',
    icon: '🔄',
    command: (e) =>
      e
        ?.chain()
        .focus()
        .insertSyncedBlock(prompt('Synced Block ID:') || '', '')
        .run(),
  },
];

// ─── Format conversion utilities (delegated to typed helpers) ──────────────

function tiptapToMarkdown(doc: PMNode): string {
  // The helpers version handles all standard node types.
  // Additional node types from custom extensions are handled by the fallback walker.
  return typedTiptapToMarkdown(doc);
}

function markdownToProseMirror(md: string): PMNode {
  return typedMarkdownToProseMirror(md);
}

// ─── Emoji data ───────────────────────────────────────────────────────────────

const EMOJI_LIST = [
  ['😀', 'grinning'],
  ['😄', 'smile'],
  ['😁', 'grin'],
  ['😅', 'sweat_smile'],
  ['😂', 'joy'],
  ['🤣', 'rofl'],
  ['😊', 'blush'],
  ['😇', 'innocent'],
  ['🙂', 'slightly_smiling'],
  ['😉', 'wink'],
  ['😌', 'relieved'],
  ['😍', 'heart_eyes'],
  ['🥰', 'smiling_hearts'],
  ['😘', 'kissing_heart'],
  ['😗', 'kissing'],
  ['😋', 'yum'],
  ['😛', 'stuck_out_tongue'],
  ['😜', 'wink_tongue'],
  ['🤗', 'hugs'],
  ['🤔', 'thinking'],
  ['🤨', 'raised_eyebrow'],
  ['😐', 'neutral'],
  ['😑', 'expressionless'],
  ['😶', 'no_mouth'],
  ['😏', 'smirk'],
  ['😒', 'unamused'],
  ['🙄', 'roll_eyes'],
  ['😬', 'grimacing'],
  ['😮', 'open_mouth'],
  ['😯', 'hushed'],
  ['😲', 'astonished'],
  ['😳', 'flushed'],
  ['🥺', 'pleading'],
  ['😢', 'cry'],
  ['😭', 'sob'],
  ['😤', 'triumph'],
  ['😠', 'angry'],
  ['😡', 'rage'],
  ['🤬', 'cursing'],
  ['😈', 'smiling_imp'],
  ['👿', 'imp'],
  ['💀', 'skull'],
  ['☠️', 'skull_crossbones'],
  ['💩', 'poop'],
  ['🤡', 'clown'],
  ['👹', 'ogre'],
  ['👺', 'goblin'],
  ['👻', 'ghost'],
  ['👽', 'alien'],
  ['🤖', 'robot'],
  ['👍', 'thumbsup'],
  ['👎', 'thumbsdown'],
  ['👊', 'fist'],
  ['✊', 'raised_fist'],
  ['🤛', 'left_fist'],
  ['🤜', 'right_fist'],
  ['👋', 'wave'],
  ['✋', 'raised_hand'],
  ['🖐️', 'splayed_hand'],
  ['✌️', 'v'],
  ['🤞', 'crossed_fingers'],
  ['🫰', 'heart_hands'],
  ['🤟', 'love_you'],
  ['🤘', 'metal'],
  ['🤙', 'call_me'],
  ['👌', 'ok_hand'],
  ['✅', 'check_mark'],
  ['❌', 'cross_mark'],
  ['❤️', 'heart'],
  ['🧡', 'orange_heart'],
  ['💛', 'yellow_heart'],
  ['💚', 'green_heart'],
  ['💙', 'blue_heart'],
  ['💜', 'purple_heart'],
  ['🖤', 'black_heart'],
  ['🤍', 'white_heart'],
  ['💔', 'broken_heart'],
  ['❤️‍🔥', 'heart_fire'],
  ['💖', 'sparkling_heart'],
  ['💗', 'growing_heart'],
  ['💓', 'heartbeat'],
  ['💕', 'two_hearts'],
  ['💞', 'revolving_hearts'],
  ['💌', 'love_letter'],
  ['💋', 'kiss'],
  ['💯', '100'],
  ['🔥', 'fire'],
  ['💪', 'muscle'],
  ['🦄', 'unicorn'],
  ['🤩', 'star_struck'],
  ['🎉', 'tada'],
  ['🎊', 'confetti'],
  ['🎈', 'balloon'],
  ['🎁', 'gift'],
  ['🏆', 'trophy'],
  ['⭐', 'star'],
  ['🌟', 'glowing_star'],
  ['✨', 'sparkles'],
  ['💡', 'bulb'],
  ['📝', 'memo'],
  ['📌', 'pushpin'],
  ['🔗', 'link'],
  ['🚀', 'rocket'],
  ['🛠️', 'tools'],
  ['⚙️', 'gear'],
  ['🔧', 'wrench'],
  ['📊', 'bar_chart'],
  ['📈', 'chart_up'],
  ['📉', 'chart_down'],
  ['🗂️', 'card_index'],
  ['📁', 'folder'],
  ['📂', 'open_folder'],
  ['🗃️', 'card_box'],
  ['📚', 'books'],
  ['📖', 'book'],
  ['🔒', 'lock'],
  ['🔓', 'unlock'],
  ['🔑', 'key'],
  ['🛡️', 'shield'],
  ['🚨', 'alarm'],
  ['⚠️', 'warning'],
  ['🚫', 'prohibited'],
  ['♻️', 'recycle'],
  ['📣', 'megaphone'],
  ['💬', 'speech_bubble'],
  ['🗨️', 'left_speech'],
  ['👀', 'eyes'],
  ['🧠', 'brain'],
  ['💻', 'laptop'],
  ['📱', 'mobile'],
  ['☕', 'coffee'],
  ['🍕', 'pizza'],
  ['🍔', 'burger'],
  ['🍺', 'beer'],
  ['🎵', 'music'],
  ['🎶', 'musical_notes'],
  ['🎬', 'clapper'],
  ['🎨', 'palette'],
  ['🏗️', 'construction'],
  ['🧪', 'test_tube'],
  ['🔬', 'microscope'],
  ['📡', 'satellite'],
  ['🌐', 'globe'],
  ['☁️', 'cloud'],
  ['🌍', 'earth'],
  ['🌈', 'rainbow'],
  ['⭐', 'star2'],
  ['🌟', 'star3'],
  ['🌙', 'moon'],
  ['☀️', 'sun'],
  ['❄️', 'snowflake'],
  ['🔥', 'fire2'],
  ['💧', 'droplet'],
  ['🌊', 'wave2'],
];

// ─── Floating format toolbar (replaces Tiptap v3 BubbleMenu) ──────────────────

function FloatingToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor || !editor) return;
    const update = () => {
      if (!editor) return;
      const { selection } = editor.state;
      if (!selection.empty && selection.content().size > 0) {
        const { view } = editor;
        const coords = view.coordsAtPos(selection.from);
        const editorRect = view.dom.getBoundingClientRect();
        setPos({
          top: coords.top - editorRect.top - 40,
          left: coords.left - editorRect.left + (coords.right - coords.left) / 2,
        });
        setShow(true);
      } else {
        setShow(false);
      }
    };
    editor.on('selectionUpdate', update);
    editor.on('blur' as unknown, () => setShow(false));
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('blur' as unknown, () => setShow(false));
    };
  }, [editor]);

  if (!show) return null;

  const handleAddLink = () => {
    const url = prompt('Link URL:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  return createPortal(
    <div
      ref={ref}
      className="flex items-center gap-0.5 p-1 rounded-lg border border-border bg-[#1a1a1a] shadow-2xl fixed z-50"
      style={{ top: pos.top, left: pos.left - 100, transform: 'translateX(-50%)' }}
    >
      <button
        onClick={() => editor?.chain().focus().toggleBold().run()}
        className={cn(
          'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          editor?.isActive('bold') && 'text-primary bg-primary/10',
        )}
        title="Bold (Cmd+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        className={cn(
          'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          editor?.isActive('italic') && 'text-primary bg-primary/10',
        )}
        title="Italic (Cmd+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        className={cn(
          'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          editor?.isActive('underline') && 'text-primary bg-primary/10',
        )}
        title="Underline (Cmd+U)"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        className={cn(
          'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          editor?.isActive('strike') && 'text-primary bg-primary/10',
        )}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => editor?.chain().focus().toggleCode().run()}
        className={cn(
          'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          editor?.isActive('code') && 'text-primary bg-primary/10',
        )}
        title="Inline Code"
      >
        <Code className="h-3.5 w-3.5" />
      </button>
      <span className="w-px h-4 bg-border mx-0.5" />
      <button
        onClick={handleAddLink}
        className={cn(
          'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          editor?.isActive('link') && 'text-primary bg-primary/10',
        )}
        title="Link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </button>
    </div>,
    document.body,
  );
}

// ─── Image Floating Toolbar ───────────────────────────────────────────────────

function ImageToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [widthInput, setWidthInput] = useState('');

  useEffect(() => {
    if (!editor || !editor) return;
    const update = () => {
      if (!editor) return;
      const { selection } = editor.state;
      if ((selection as unknown).type.name !== 'NodeSelection') {
        setPos(null);
        return;
      }
      const node = (selection as unknown).node;
      if (!node || node.type.name !== 'imageEnhanced') {
        setPos(null);
        return;
      }
      const view = editor.view;
      const from = selection.from;
      const coords = view.coordsAtPos(from);
      setPos({
        top: coords.top - 56,
        left: coords.left + view.dom.getBoundingClientRect().width / 2,
      });
      setWidthInput(node.attrs.width || '');
    };
    editor.on('selectionUpdate', update);
    editor.on('blur' as unknown, () => setTimeout(() => setPos(null), 200));
    // Also update on click (if view is available)
    try {
      editor.view.dom.addEventListener('mouseup', update);
    } catch {}
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('blur' as unknown, () => setPos(null));
      try {
        editor.view.dom.removeEventListener('mouseup', update);
      } catch {}
    };
  }, [editor]);

  if (!pos || !editor) return null;

  const { selection } = editor.state;
  if ((selection as unknown).type.name !== 'NodeSelection') return null;
  const node = (selection as unknown).node;
  if (!node || node.type.name !== 'imageEnhanced') return null;

  const currentAttrs = node.attrs;
  const align = currentAttrs.align || 'center';
  const width = currentAttrs.width || '';

  const setAlign = (newAlign: 'left' | 'center' | 'right') => {
    editor.chain().focus().updateAttributes('imageEnhanced', { align: newAlign }).run();
  };

  const resizePresets = [
    { label: 'S', width: '200px' },
    { label: 'M', width: '400px' },
    { label: 'L', width: '600px' },
    { label: 'XL', width: '800px' },
    { label: 'Full', width: '100%' },
  ];

  const handleWidthApply = () => {
    const val = widthInput.trim();
    if (val) {
      const num = parseInt(val);
      if (!isNaN(num) && num > 0) {
        editor
          .chain()
          .focus()
          .updateAttributes('imageEnhanced', { width: `${num}px` })
          .run();
      } else if (val.endsWith('%') || val.endsWith('px')) {
        editor.chain().focus().updateAttributes('imageEnhanced', { width: val }).run();
      }
    }
  };

  return createPortal(
    <div
      className="fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-[#1a1a1a] shadow-2xl"
      style={{
        top: pos.top,
        left: '50%',
        transform: 'translateX(-50%)',
      }}
      contentEditable={false}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Alignment */}
      <div className="flex items-center gap-0.5 mr-1">
        <button
          onClick={() => setAlign('left')}
          className={`p-1 rounded transition-colors ${align === 'left' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          title="Align left"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="17" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="17" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => setAlign('center')}
          className={`p-1 rounded transition-colors ${align === 'center' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          title="Align center"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="10" x2="6" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="18" y1="14" x2="6" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => setAlign('right')}
          className={`p-1 rounded transition-colors ${align === 'right' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          title="Align right"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="21" y1="10" x2="7" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="7" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        </button>
      </div>

      <span className="w-px h-5 bg-border mx-0.5" />

      {/* Resize presets */}
      <div className="flex items-center gap-0.5">
        {resizePresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() =>
              editor
                .chain()
                .focus()
                .updateAttributes('imageEnhanced', { width: preset.width })
                .run()
            }
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              width === preset.width
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title={`${preset.label} (${preset.width})`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom width input */}
      <div className="flex items-center gap-1 ml-1">
        <input
          type="text"
          value={widthInput}
          onChange={(e) => setWidthInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleWidthApply();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Width"
          className="w-16 h-6 px-1.5 rounded border border-border/50 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-hidden focus:border-primary/50 text-center"
        />
      </div>
    </div>,
    document.body,
  );
}

// ─── Table floating toolbar ─────────────────────────────────────────────────

function TableToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [insideTable, setInsideTable] = useState(false);

  useEffect(() => {
    if (!editor || !editor) return;
    const update = () => {
      if (!editor) return;
      const { selection } = editor.state;
      const { $from } = selection;
      let inTable = false;
      // Walk up the resolved position to see if we're inside a tableCell/tableHeader
      for (let d = $from.depth; d > 0; d--) {
        const node = $from.node(d);
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          inTable = true;
          break;
        }
      }
      setInsideTable(inTable);
      if (!inTable) {
        setPos(null);
        return;
      }
      // Position above the current cell
      const view = editor.view;
      const coords = view.coordsAtPos($from.pos);
      setPos({
        top: coords.top - 48,
        left: coords.left,
      });
    };
    editor.on('selectionUpdate', update);
    editor.on('blur' as unknown, () => setTimeout(() => setPos(null), 200));
    try {
      editor.view.dom.addEventListener('mouseup', update);
    } catch {}
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('blur' as unknown, () => setPos(null));
      try {
        editor.view.dom.removeEventListener('mouseup', update);
      } catch {}
    };
  }, [editor]);

  if (!pos || !insideTable || !editor) return null;

  return createPortal(
    <div
      className="fixed z-50 flex items-center gap-0.5 p-1 rounded-lg border border-border bg-[#1a1a1a] shadow-2xl"
      style={{ top: pos.top, left: Math.max(16, pos.left), transform: 'translateX(-50%)' }}
      contentEditable={false}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Insert row before */}
      <button
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Insert row before"
      >
        <Plus className="h-3 w-3" />
        <Rows3 className="h-2.5 w-2.5 -ml-0.5" />
      </button>

      {/* Insert row after */}
      <button
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Insert row after"
      >
        <Rows3 className="h-2.5 w-2.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
      </button>

      {/* Delete row */}
      <button
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Delete row"
      >
        <Rows3 className="h-3 w-3" />
        <X className="h-2.5 w-2.5 text-red-400 -ml-1" />
      </button>

      <span className="w-px h-4 bg-border mx-0.5" />

      {/* Insert column before */}
      <button
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Insert column before"
      >
        <Plus className="h-3 w-3" />
        <Columns3 className="h-2.5 w-2.5 -ml-0.5" />
      </button>

      {/* Insert column after */}
      <button
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Insert column after"
      >
        <Columns3 className="h-2.5 w-2.5" />
        <Plus className="h-3 w-3 -ml-0.5" />
      </button>

      {/* Delete column */}
      <button
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Delete column"
      >
        <Columns3 className="h-3 w-3" />
        <X className="h-2.5 w-2.5 text-red-400 -ml-1" />
      </button>

      <span className="w-px h-4 bg-border mx-0.5" />

      {/* Merge cells */}
      <button
        onClick={() => editor.chain().focus().mergeCells().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Merge selected cells"
      >
        <TableCellsMerge className="h-3.5 w-3.5" />
      </button>

      {/* Split cell */}
      <button
        onClick={() => editor.chain().focus().splitCell().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Split cell"
      >
        <TableCellsSplit className="h-3.5 w-3.5" />
      </button>

      {/* Toggle header row */}
      <button
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Toggle header row"
      >
        <TableProperties className="h-3.5 w-3.5" />
      </button>
    </div>,
    document.body,
  );
}

// ─── Page Editor Component ────────────────────────────────────────────────────

interface Props {
  userId: string | null;
}

export function PageEditor({ userId }: Props) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const [page, setPage] = useState<Page | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const editorRef = useRef<HTMLDivElement>(null);
  // Cache for attachment:// → blob: URL resolution, cleaned up on unmount
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map());

  // Slash menu state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashPos, setSlashPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Emoji picker state
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');
  const [emojiIndex, setEmojiIndex] = useState(0);
  const [emojiPos, setEmojiPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Tags state
  const [tags, setTags] = useState<{ id: string; name: string; value: string }[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Keyboard shortcuts modal
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<
    { src: string; alt: string; imageId?: string }[] | null
  >(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'markdown' | 'split'>('wysiwyg');
  const [markdownSource, setMarkdownSource] = useState('');

  // Page link autocomplete state ([[ trigger)
  const [showPageLink, setShowPageLink] = useState(false);
  const [pageLinkQuery, setPageLinkQuery] = useState('');
  const [pageLinkIndex, setPageLinkIndex] = useState(0);
  const [pageLinkPos, setPageLinkPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [allPages, setAllPages] = useState<Page[]>([]);

  // ─── Real-time collaboration ────────────────────────────────────────────
  const [collabUserName, setCollabUserName] = useState(
    () => localStorage.getItem('sw_user_name') || 'User',
  );
  const collabPageId = isNew ? undefined : id;
  const collabUserId = userId || undefined;
  const {
    collaborationExtension,
    collaborationCursorExtension,
    remoteUsers,
    isActive: collabActive,
    ydoc,
  } = useCollaboration(collabPageId, collabUserId, collabUserName);

  // Load user name from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('sw_user_name');
    if (stored) setCollabUserName(stored);
  }, []);

  // Load all pages for link autocomplete
  useEffect(() => {
    api.pages
      .list()
      .then(setAllPages)
      .catch((err) => console.error('Failed to load pages for autocomplete:', err));
  }, []);

  // Load existing page
  useEffect(() => {
    if (id) {
      api.pages
        .get(id)
        .then((p) => {
          if (p) {
            setPage(p);
            setTitle(p.title);
          }
          setLoading(false);
        })
        .catch((err) => {
          setError(String(err));
          setLoading(false);
        });
    }
  }, [id]);

  // Load tags when editing existing page
  useEffect(() => {
    if (id) api.tags.list(id).then(setTags);
  }, [id, page]);

  const handleAddTag = async () => {
    const name = tagInput.trim();
    if (!name || !id) return;
    const tagId = await api.tags.add(id, name, '');
    setTags([...tags, { id: tagId, name, value: '' }]);
    setTagInput('');
  };

  const handleRemoveTag = async (tagId: string) => {
    await api.tags.remove(tagId);
    setTags(tags.filter((t) => t.id !== tagId));
  };

  // ─── Feature flags ─────────────────────────────────────────────────────────

  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const val = await api.settings.get('feature_flags');
        if (val) {
          const parsed = JSON.parse(val);
          setFeatureFlags(parsed);
        } else {
          // Default: all enabled
          setFeatureFlags({
            callouts: true,
            mermaid: true,
            math: true,
            embeds: true,
            video: true,
            drawio: true,
            plantuml: true,
            details: true,
            mentions: true,
          });
        }
      } catch {
        /* use defaults */
      }
    })();
  }, []);

  const isFeatureEnabled = (key: string): boolean => {
    if (featureFlags === null) return true; // during loading, show all
    return featureFlags[key] !== false;
  };

  // ─── Editor ──────────────────────────────────────────────────────────────

  const editorReadyRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false, // replaced by CodeBlockLowlight
        link: false, // use explicit Link.configure below
      }),
      Typography,
      HeadingWithId.configure({ levels: [1, 2, 3] }),
      DragHandle,
      Placeholder.configure({ placeholder: 'Start writing... or type / for commands' }),
      Link.configure({ openOnClick: false }),
      ImageEnhanced,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      CodeBlockLowlight.configure({ lowlight }),
      // Slash commands handled via keydown listener below
      ...(isFeatureEnabled('details') ? [Details] : []),
      ...(isFeatureEnabled('callouts') ? [Callout] : []),
      ...(isFeatureEnabled('mermaid') ? [Mermaid] : []),
      ...(isFeatureEnabled('math') ? [MathInline, MathBlock] : []),
      ...(isFeatureEnabled('video') ? [VideoEmbed] : []),
      ...(isFeatureEnabled('embeds') ? [RichEmbed] : []),
      ...(isFeatureEnabled('drawio') ? [Drawio] : []),
      ...(isFeatureEnabled('plantuml') ? [PlantUML] : []),
      ...(isFeatureEnabled('mentions')
        ? [Mention.configure({ HTMLAttributes: { class: 'mention' } })]
        : []),
      ...(isFeatureEnabled('database') ? [DatabaseBase] : []),
      ...(isFeatureEnabled('syncedBlocks') ? [SyncedBlockExtension] : []),
      // Real-time collaboration extensions (Yjs/STDB)
      ...(collabActive ? [collaborationExtension] : []),
      ...(collabActive ? [collaborationCursorExtension] : []),
    ],
    content: page
      ? (() => {
          try {
            return JSON.parse(page.content || '{}');
          } catch {
            return '<p></p>';
          }
        })()
      : undefined,
    editable: !preview,
    editorProps: {
      handlePaste: (_, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        // Check for pasted images first
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              // Upload image to server storage for permanent URL
              handleImageFile(file);
            }
            return true;
          }
        }
        // Check for pasted video URLs (text)
        const text = event.clipboardData?.getData('text');
        if (text) {
          // Check each line for video URLs first, then rich embeds
          const lines = text
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
          for (const line of lines) {
            const provider = detectProvider(line);
            if (provider) {
              event.preventDefault();
              editor?.chain().focus().setVideoEmbed({ src: line }).run();
              return true;
            }
            // Check for rich embed (30+ providers)
            const embedProvider = detectEmbedProvider(line);
            if (embedProvider) {
              event.preventDefault();
              editor?.chain().focus().setRichEmbed({ src: line }).run();
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (_, event) => {
        const files = event.dataTransfer?.files;
        if (!files) return false;
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            // Upload dropped image to server storage
            handleImageFile(file);
            return true;
          }
        }
        return false;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'IMG' && target.getAttribute('src')) {
          const clickedSrc = target.getAttribute('src')!;
          const clickedAlt = target.getAttribute('alt') || '';
          try {
            const jsonContent = editor?.getJSON();
            const images: { src: string; alt: string; imageId?: string }[] = [];
            const walkNodes = (node: PMNode) => {
              if (node.attrs?.src && typeof node.attrs.src === 'string') {
                images.push({
                  src: node.attrs.src as string,
                  alt: (node.attrs.alt as string) || '',
                  imageId: (node.attrs.imageId as string) || undefined,
                });
              }
              if (node.content) {
                node.content.forEach(walkNodes);
              }
            };
            if (jsonContent?.type === 'doc' && jsonContent.content) {
              jsonContent.content.forEach(walkNodes);
            }
            const idx = images.findIndex((i) => i.src === clickedSrc);
            setLightboxImages(images);
            setLightboxIndex(idx >= 0 ? idx : 0);
          } catch {
            setLightboxImages([{ src: clickedSrc, alt: clickedAlt }]);
            setLightboxIndex(0);
          }
          return true;
        }
        return false;
      },
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-hidden min-h-[60vh]',
      },
    },
    onCreate: () => {
      editorReadyRef.current = true;
    },
  });
  // ─── Auto-save drafts to localStorage ───────────────────────────────────────
  const [hasDraft, setHasDraft] = useState(false);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const lastSavedJson = useRef('');

  const draftKey = isNew ? 'sw_draft_new' : `sw_draft_${id}`;

  // Check for existing draft on mount
  useEffect(() => {
    if (!editor || !editorReadyRef.current) return;
    if (isNew) {
      // For new pages, show draft banner immediately if draft exists
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setHasDraft(true);
          }
        } catch {
          /* ignore corrupt draft */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, page, isNew]);

  // Auto-save interval: every 5 seconds when editor has content
  useEffect(() => {
    if (!editor || !editorReadyRef.current) return;
    const interval = setInterval(() => {
      if (preview) return;
      const json = JSON.stringify(editor.getJSON());
      if (json !== lastSavedJson.current && json !== '{}') {
        lastSavedJson.current = json;
        try {
          localStorage.setItem(draftKey, json);
        } catch {
          // localStorage full or unavailable — silently ignore
        }
      }
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, preview]);

  // Track initial content to seed lastSavedJson
  useEffect(() => {
    if (editor && page) {
      try {
        const json = JSON.stringify(JSON.parse(page.content || '{}'));
        lastSavedJson.current = json;
      } catch {
        /* ignore */
      }
    } else if (editor && isNew) {
      lastSavedJson.current = JSON.stringify(editor.getJSON());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isNew]);

  // Restore draft content
  const handleRestoreDraft = () => {
    const saved = localStorage.getItem(draftKey);
    if (saved && editor) {
      try {
        const parsed = JSON.parse(saved);
        editor.commands.setContent(parsed);
      } catch {
        /* ignore */
      }
    }
    setHasDraft(false);
    setDraftDismissed(true);
  };

  const handleDismissDraft = () => {
    setHasDraft(false);
    setDraftDismissed(true);
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setHasDraft(false);
    lastSavedJson.current = JSON.stringify(editor ? editor.getJSON() : {});
  };

  // Sync content when page loads — resolve attachment:// URLs to blob URLs
  useEffect(() => {
    if (editor && page) {
      try {
        const parsed = JSON.parse(page.content || '{}');
        if (parsed?.type === 'doc') {
          // Resolve any attachment:// URLs to blob URLs for display
          resolveContentAttachments(parsed, blobUrlCacheRef.current).then((resolved) => {
            editor.commands.setContent(resolved as unknown);
          });
        }
      } catch {
        /* ignore */
      }
    }
  }, [page, editor]);

  // Toggle editable for preview
  useEffect(() => {
    if (editor) editor.setEditable(!preview);
  }, [preview, editor]);

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!editor || !title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const content = JSON.stringify(editor.getJSON());
      if (isNew) {
        const result = await api.pages.create(title, content, '', '', userId || 'anonymous');
        const newId =
          typeof result === 'string' ? result : String((result as unknown)[0] || result);
        clearDraft();
        navigate(`/page/${newId}`);
      } else if (id) {
        await api.pages.update(id, title, content, userId || 'anonymous');
        clearDraft();
      }
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }, [editor, title, isNew, id, userId, navigate]);

  const handleImageUpload = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    e.target.value = '';
  };

  /** Upload an image file to STDB attachment storage and insert it into the editor */
  const handleImageFile = async (file: File, retryCount = 0) => {
    if (file.size > MAX_IMAGE_BYTES) {
      const msg = `Image too large (max ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB)`;
      showToast({ type: 'warning', title: 'Image size exceeded', message: msg, duration: 6000 });
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'error',
        title: 'Invalid file type',
        message: 'Only image files are supported',
        duration: 5000,
      });
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      const attId = await api.attachments.add(
        page?.id || id || 'temp',
        file.name,
        file.type,
        file.size,
        base64,
        userId || 'anonymous',
      );
      // Store attachment:// URL in the editor — resolved at load time via resolveContentAttachments
      const attUrl = `attachment://${attId}`;
      editor?.chain().focus().setImageEnhanced({ src: attUrl }).run();
      showToast({ type: 'success', title: 'Image uploaded', message: file.name, duration: 3000 });
    } catch (err: unknown) {
      console.error('Image upload failed:', err);
      const isNetworkError =
        err instanceof TypeError ||
        (err as Record<string, unknown>)?.name === 'AbortError' ||
        String(err)?.includes('fetch');
      const errorType = isNetworkError ? 'network' : 'server';
      const title =
        errorType === 'network' ? 'Network error — image upload failed' : 'Upload failed';
      const msg = (err as Error)?.message || String(err) || 'Unknown error';
      // Offer retry on first attempt
      if (retryCount < 2) {
        showToast({
          type: 'error',
          title,
          message: `${file.name}: ${msg}`,
          duration: 8000,
          action: { label: 'Retry', onClick: () => handleImageFile(file, retryCount + 1) },
        });
      } else {
        showToast({
          type: 'error',
          title: 'Upload failed after 3 attempts',
          message: `${file.name}: ${msg}`,
          duration: 0, // persistent — user must dismiss
        });
      }
    }
  };

  // Add link
  const handleAddLink = () => {
    const url = prompt('URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    await api.pages.setStatus(id, 'published');
    navigate(`/page/${id}`);
  };
  const handleArchive = async () => {
    if (!id) return;
    await api.pages.setStatus(id, 'archived');
    navigate('/');
  };
  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Permanently delete this page?')) return;
    await api.pages.delete(id);
    navigate('/');
  };
  const handleDuplicate = async () => {
    if (!id) return;
    const result = await api.pages.duplicate(id, userId || 'anonymous');
    const newId = typeof result === 'string' ? result : String((result as unknown)[0] || result);
    navigate(`/page/${newId}/edit`);
  };

  // Keyboard shortcut: Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          setShowShortcuts(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Slash command: detect "/" in editor
  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.title.toLowerCase().includes(slashQuery.toLowerCase()),
  );

  const closeSlash = () => {
    setSlashOpen(false);
    setSlashQuery('');
    setSlashIndex(0);
  };

  // Emoji helpers
  const filteredEmoji = EMOJI_LIST.filter(
    ([emoji, name]) => name.includes(emojiQuery.toLowerCase()) || emoji === emojiQuery,
  ).slice(0, 12);

  const closeEmoji = () => {
    setEmojiOpen(false);
    setEmojiQuery('');
    setEmojiIndex(0);
  };

  const executeEmojiSelect = (idx: number) => {
    const match = filteredEmoji[idx];
    if (match && editor) {
      const emoji = match[0];
      // Find the ":" and delete text up to cursor, then insert emoji
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const nodeStart = $pos.start();
      const textBefore = editor.state.doc.textBetween(nodeStart, from);
      const colonIdx = textBefore.lastIndexOf(':');
      if (colonIdx >= 0) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: nodeStart + colonIdx, to: from })
          .insertContent(emoji)
          .run();
      } else {
        editor.chain().focus().insertContent(emoji).run();
      }
    }
    closeEmoji();
  };

  const executeSlashCommand = (idx: number) => {
    const cmd = filteredCommands[idx];
    if (cmd && editor) {
      // Remove the "/" character(s) typed
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const nodeStart = $pos.start();
      const textBefore = editor.state.doc.textBetween(nodeStart, from);
      const slashIdx = textBefore.lastIndexOf('/');
      if (slashIdx >= 0) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: nodeStart + slashIdx, to: from })
          .run();
      }
      cmd.command(editor);
    }
    closeSlash();
  };

  // Listen for / in the editor
  useEffect(() => {
    if (!editor || !editorReadyRef.current || preview) return;
    const handler = (
      view: {
        state: {
          selection: { from: number };
          doc: {
            resolve: (pos: number) => { start: () => number };
            textBetween: (from: number, to: number) => string;
          };
        };
        coordsAtPos: (pos: number) => { top: number; left: number };
      },
      event: KeyboardEvent,
    ) => {
      if (event.key === '/' && !slashOpen) {
        const { from } = view.state.selection;
        const $pos = view.state.doc.resolve(from);
        const nodeStart = $pos.start();
        const text = view.state.doc.textBetween(nodeStart, from);
        // Only trigger at line start or after whitespace
        if (text.trim() === '' || text.endsWith(' ')) {
          const coords = view.coordsAtPos(from);
          setSlashPos({ top: coords.top + 24, left: coords.left });
          setSlashOpen(true);
          setSlashQuery('');
          setSlashIndex(0);
          return false; // let the "/" be typed
        }
      }
      // Emoji picker — detect ":" in text
      if (event.key === ':' && !emojiOpen && !slashOpen) {
        const { from } = view.state.selection;
        const $pos = view.state.doc.resolve(from);
        const nodeStart = $pos.start();
        const text = view.state.doc.textBetween(nodeStart, from);
        // Only trigger inline (not at line start like slash)
        if (text.trim() !== '' && !text.endsWith(':') && !text.endsWith(' ')) {
          // Don't open — there's no query yet, wait for the next character
        } else {
          const coords = view.coordsAtPos(from);
          setEmojiPos({ top: coords.top + 24, left: Math.max(10, coords.left - 80) });
          setEmojiOpen(true);
          setEmojiQuery('');
          setEmojiIndex(0);
          return false;
        }
      }
      // Page link autocomplete — detect "[[" in text
      if (event.key === '[' && !showPageLink && !emojiOpen && !slashOpen) {
        const { from } = view.state.selection;
        const $pos = view.state.doc.resolve(from);
        const nodeStart = $pos.start();
        const text = view.state.doc.textBetween(Math.max(0, from - 2), from);
        // Trigger when user types second "[" (i.e. "[[")
        if (text === '[' && from > 1) {
          const coords = view.coordsAtPos(from);
          setPageLinkPos({ top: coords.top + 24, left: Math.max(10, coords.left - 80) });
          setShowPageLink(true);
          setPageLinkQuery('');
          setPageLinkIndex(0);
          // Don't prevent default — let both "[" be typed
          return false;
        }
      }
      if (emojiOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setEmojiIndex((i) => Math.min(i + 1, filteredEmoji.length - 1));
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setEmojiIndex((i) => Math.max(i - 1, 0));
          return true;
        }
        if (event.key === 'Enter' && filteredEmoji.length > 0) {
          event.preventDefault();
          executeEmojiSelect(emojiIndex);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeEmoji();
          return true;
        }
        if (event.key === ' ' || event.key === ':') {
          // Space or second colon — insert selected emoji if matched, or close
          if (filteredEmoji.length > 0 && filteredEmoji[0][1].startsWith(emojiQuery)) {
            event.preventDefault();
            executeEmojiSelect(0);
            return true;
          }
          closeEmoji();
        }
        // Track typed query
        if (event.key.length === 1) {
          setTimeout(() => {
            const sel = editor.state.selection;
            const text = editor.state.doc.textBetween(Math.max(0, sel.from - 40), sel.from);
            const colonIdx = text.lastIndexOf(':');
            if (colonIdx >= 0) setEmojiQuery(text.slice(colonIdx + 1).replace(/\s/g, ''));
            else closeEmoji();
          }, 10);
        } else if (event.key === 'Backspace') {
          setTimeout(() => {
            setEmojiQuery((q) => {
              if (q.length <= 1) {
                closeEmoji();
                return '';
              }
              return q.slice(0, -1);
            });
          }, 10);
        }
        return false;
      }
      // Page link autocomplete: keyboard navigation
      if (showPageLink) {
        const filtered = allPages.filter((p) =>
          p.title.toLowerCase().includes(pageLinkQuery.toLowerCase()),
        );
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setPageLinkIndex((i) => Math.min(i + 1, Math.min(filtered.length - 1, 9)));
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setPageLinkIndex((i) => Math.max(i - 1, 0));
          return true;
        }
        if (event.key === 'Enter' && filtered.length > 0) {
          event.preventDefault();
          const p = filtered[pageLinkIndex] || filtered[0];
          if (p) {
            const { from } = view.state.selection;
            const $pos = view.state.doc.resolve(from);
            const nodeStart = $pos.start();
            const textBefore = view.state.doc.textBetween(nodeStart, from);
            const bracketIdx = textBefore.lastIndexOf('[[');
            if (bracketIdx >= 0) {
              (view as unknown).dispatch(
                (view as unknown).state.tr
                  .delete(nodeStart + bracketIdx, from)
                  .insertText(p.title, nodeStart + bracketIdx),
              );
              // Wrap in a link
              const after = nodeStart + bracketIdx + p.title.length;
              (view as unknown).dispatch(
                (view as unknown).state.tr.addMark(
                  nodeStart + bracketIdx,
                  after,
                  (view as unknown).state.schema.marks.link.create({ href: `/page/${p.id}` }),
                ),
              );
            }
          }
          setShowPageLink(false);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setShowPageLink(false);
          return true;
        }
        // Track typed query
        if (event.key.length === 1) {
          setTimeout(() => {
            const sel = view.state.selection;
            const text = view.state.doc.textBetween(Math.max(0, sel.from - 20), sel.from);
            const bracketIdx = text.lastIndexOf('[[');
            if (bracketIdx >= 0) setPageLinkQuery(text.slice(bracketIdx + 2));
            else setShowPageLink(false);
          }, 10);
        } else if (event.key === 'Backspace') {
          setTimeout(() => {
            setPageLinkQuery((q) => {
              if (q.length <= 0) {
                setShowPageLink(false);
                return '';
              }
              return q.slice(0, -1);
            });
          }, 10);
        }
        return false;
      }
      if (slashOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSlashIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSlashIndex((i) => Math.max(i - 1, 0));
          return true;
        }
        if (event.key === 'Enter' && filteredCommands.length > 0) {
          event.preventDefault();
          executeSlashCommand(slashIndex);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeSlash();
          return true;
        }
        // Track typed query
        if (event.key.length === 1) {
          setTimeout(() => {
            const sel = editor.state.selection;
            const text = editor.state.doc.textBetween(Math.max(0, sel.from - 20), sel.from);
            const slashIdx = text.lastIndexOf('/');
            if (slashIdx >= 0) setSlashQuery(text.slice(slashIdx + 1));
          }, 10);
        } else if (event.key === 'Backspace') {
          setTimeout(() => {
            setSlashQuery((q) => q.slice(0, -1));
          }, 10);
        }
        return false;
      }
      return false;
    };
    try {
      editor.view.dom.addEventListener('keydown', handler as unknown, true);
    } catch {}
    return () => {
      try {
        editor.view.dom.removeEventListener('keydown', handler as unknown, true);
      } catch {}
    };
  }, [
    editor,
    slashOpen,
    preview,
    filteredCommands,
    slashIndex,
    showPageLink,
    pageLinkQuery,
    pageLinkIndex,
    allPages,
  ]);

  // Close slash menu on click outside
  useEffect(() => {
    if (!slashOpen) return;
    const handler = (e: MouseEvent) => closeSlash();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [slashOpen]);

  // Close page link popup on click outside
  useEffect(() => {
    if (!showPageLink) return;
    const handler = () => setShowPageLink(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showPageLink]);

  // Close color picker on click outside
  useEffect(() => {
    if (!showColorPicker) return;
    const handler = () => setShowColorPicker(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showColorPicker]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    const cache = blobUrlCacheRef.current;
    return () => {
      cache.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
      cache.clear();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const EditorButton = ({
    onClick,
    active = false,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        active && 'text-primary bg-primary/10',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn(page?.full_width ? 'mx-auto px-4 md:px-8' : 'max-w-4xl mx-auto')}>
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload image"
      />

      {/* Top toolbar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xs border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground">{isNew ? 'New page' : 'Editing'}</span>
            {page?.status === 'draft' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500">
                Draft
              </span>
            )}
            {/* Remote users (collaboration) */}
            {collabActive && remoteUsers.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                {remoteUsers.map((u) => (
                  <span
                    key={u.userId}
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: u.color + '20', color: u.color }}
                    title={`${u.userName} is editing`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: u.color }}
                    />
                    {u.userName}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isNew && (
              <>
                <button
                  onClick={() => setPreview(!preview)}
                  className={cn(
                    'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted',
                    preview && 'text-primary bg-primary/10',
                  )}
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {/* Full-width toggle */}
                {page && (
                  <button
                    onClick={async () => {
                      const newVal = !page.full_width;
                      await api.pages.setFullWidth(id || page.id, newVal);
                      setPage((prev) => (prev ? { ...prev, full_width: newVal } : prev));
                    }}
                    className={cn(
                      'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted',
                      page?.full_width && 'text-primary bg-primary/10',
                    )}
                    title={page?.full_width ? 'Constrain width' : 'Full width'}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
                {/* Text direction toggle */}
                {page && (
                  <button
                    onClick={async () => {
                      const newDir = page.direction === 'rtl' ? 'ltr' : 'rtl';
                      await api.pages.setDirection(id || page.id, newDir);
                      setPage((prev) => (prev ? { ...prev, direction: newDir } : prev));
                    }}
                    className={cn(
                      'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted font-mono text-xs px-2',
                      page?.direction === 'rtl' && 'text-primary bg-primary/10',
                    )}
                    title={
                      page?.direction === 'rtl' ? 'Switch to LTR' : 'Switch to RTL (right-to-left)'
                    }
                  >
                    {page?.direction === 'rtl' ? 'RTL' : 'LTR'}
                  </button>
                )}
                {!preview && (
                  <>
                    <button
                      onClick={handleDuplicate}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleArchive}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </>
            )}
            {!isNew && page?.status === 'draft' && (
              <button
                onClick={handlePublish}
                className="ml-2 h-7 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90"
              >
                Publish
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="ml-1 h-7 px-3 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>
          </div>
        </div>

        {/* Formatting toolbar */}
        {!preview && editor && (
          <div className="editor-toolbar flex items-center gap-0.5 px-4 pb-2 flex-wrap">
            <EditorButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Bold (Cmd+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Italic (Cmd+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="Underline (Cmd+U)"
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              active={editor.isActive('highlight')}
              title="Highlight"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')}
              title="Inline Code"
            >
              <Code className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            <EditorButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            <EditorButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              active={editor.isActive('taskList')}
              title="Task List"
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            <EditorButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleDetails().run()}
              active={editor.isActive('details')}
              title="Toggle Block"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive('codeBlock')}
              title="Code Block"
            >
              <Code className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              active={false}
              title="Divider"
            >
              <Minus className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={handleAddLink} active={editor.isActive('link')} title="Add Link">
              <LinkIcon className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton onClick={handleImageUpload} active={false} title="Insert Image">
              <ImageIcon className="h-3.5 w-3.5" />
            </EditorButton>
            <EditorButton
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              active={editor.isActive('table')}
              title="Insert Table"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </EditorButton>
            <span className="w-px h-4 bg-border mx-0.5" />
            {/* Page color accent */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={cn(
                  'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                  page?.color && 'text-primary',
                )}
                title="Page color accent"
              >
                <Palette className="h-3.5 w-3.5" />
                {page?.color && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background"
                    style={{ backgroundColor: page.color }}
                  />
                )}
              </button>
              {showColorPicker && (
                <div
                  className="absolute top-full left-0 mt-1 p-2 rounded-lg border border-border bg-card shadow-xl z-30 w-56"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-8 gap-1">
                    {[
                      '',
                      '#ef4444',
                      '#f97316',
                      '#eab308',
                      '#22c55e',
                      '#06b6d4',
                      '#3b82f6',
                      '#8b5cf6',
                      '#ec4899',
                      '#f43f5e',
                      '#a855f7',
                      '#6366f1',
                      '#00FFFF',
                      '#14b8a6',
                      '#84cc16',
                      '#d946ef',
                      '#f59e0b',
                      '#64748b',
                      '#78716c',
                      '#b45309',
                      '#047857',
                      '#0d9488',
                      '#2563eb',
                      '#7c3aed',
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={async () => {
                          if (page && id) {
                            await api.pages.setColor(id, color);
                            setPage((prev) => (prev ? { ...prev, color } : prev));
                          }
                          setShowColorPicker(false);
                        }}
                        className="w-6 h-6 rounded-md border border-border/50 hover:scale-110 transition-transform flex items-center justify-center"
                        style={{ backgroundColor: color || 'transparent' }}
                        title={color || 'No color'}
                      >
                        {color === '' && <X className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating format toolbar on text selection */}
      {editor && !preview && <FloatingToolbar editor={editor} />}

      {/* Floating image toolbar when an image is selected */}
      {editor && !preview && <ImageToolbar editor={editor} />}

      {/* Floating table toolbar when cursor is inside a table */}
      {editor && !preview && <TableToolbar editor={editor} />}

      {/* Title */}
      <div className="px-4 md:px-8 pt-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-3xl font-bold bg-transparent text-foreground placeholder:text-muted-foreground/40 outline-hidden border-none"
          disabled={preview}
        />
      </div>

      {/* Tags */}
      {!isNew && !preview && (
        <div className="px-4 md:px-8 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground"
              >
                <span className="text-[10px] text-muted-foreground/60">#</span>
                {tag.name}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-0.5 hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder={tags.length === 0 ? 'Add tags...' : '+ tag'}
              className="h-6 px-2 rounded-md border border-transparent bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-hidden focus:border-border focus:bg-muted/50 w-24"
            />
          </div>
        </div>
      )}

      {/* Tags display (view mode in page view) */}
      {!isNew && preview && tags.length > 0 && (
        <div className="px-4 md:px-8 pt-2 flex items-center gap-2 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground"
            >
              <span className="text-[10px] text-muted-foreground/60">#</span>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {page?.color && (
        <div className="px-4 md:px-8">
          <div className="h-1 rounded-full" style={{ backgroundColor: page.color }} />
        </div>
      )}

      {/* Editor mode tabs */}
      {!preview && (
        <div className="px-4 md:px-8 pt-2 pb-1">
          <div className="flex items-center gap-0.5 border-b border-border">
            <button
              onClick={() => {
                if (editor && editorMode === 'markdown') {
                  try {
                    const doc = markdownToProseMirror(markdownSource);
                    editor.commands.setContent(doc);
                  } catch {
                    /* keep current content */
                  }
                }
                setEditorMode('wysiwyg');
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium border-b-2 transition-colors',
                editorMode === 'wysiwyg'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              WYSIWYG
            </button>
            <button
              onClick={() => {
                if (editor && editorMode !== 'markdown') {
                  setMarkdownSource(tiptapToMarkdown(editor.getJSON()));
                }
                setEditorMode('markdown');
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1',
                editorMode === 'markdown'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Code2 className="h-3 w-3" /> Markdown
            </button>
            <button
              onClick={() => {
                if (editor && editorMode !== 'split') {
                  setMarkdownSource(tiptapToMarkdown(editor.getJSON()));
                }
                setEditorMode('split');
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium border-b-2 transition-colors',
                editorMode === 'split'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              Split
            </button>
          </div>
        </div>
      )}

      {/* Editor content */}
      <div className="px-4 md:px-8 pb-32">
        {editor && editorMode === 'wysiwyg' && (
          <div className={preview ? '' : 'min-h-[60vh]'} dir={page?.direction || 'ltr'}>
            <EditorContent editor={editor} />
          </div>
        )}
        {editor && editorMode === 'markdown' && (
          <textarea
            value={markdownSource}
            onChange={(e) => setMarkdownSource(e.target.value)}
            className="w-full min-h-[60vh] bg-[#0a0a0a] text-foreground font-mono text-sm p-4 rounded-lg border border-border resize-y focus:outline-hidden focus:ring-1 focus:ring-primary/50"
            spellCheck={false}
            dir={page?.direction || 'ltr'}
          />
        )}
        {editor && editorMode === 'split' && (
          <div className="grid grid-cols-2 gap-4 min-h-[60vh]">
            <div
              className="border border-border rounded-lg p-3 overflow-y-auto"
              dir={page?.direction || 'ltr'}
            >
              <EditorContent editor={editor} />
            </div>
            <textarea
              value={markdownSource}
              readOnly
              className="w-full h-full bg-[#0a0a0a] text-foreground font-mono text-sm p-3 rounded-lg border border-border resize-none focus:outline-hidden"
              spellCheck={false}
              dir={page?.direction || 'ltr'}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-md bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Draft recovery banner */}
      {hasDraft && !draftDismissed && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 shadow-2xl flex items-center gap-3 text-sm">
          <span className="text-amber-400">
            💾 Unsaved changes recovered from a previous session.
          </span>
          <button
            onClick={handleRestoreDraft}
            className="h-6 px-2.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
          >
            Restore
          </button>
          <button
            onClick={handleDismissDraft}
            className="h-6 px-2.5 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page link autocomplete popup ([[ trigger) */}
      {showPageLink && (
        <div
          className="fixed z-50 w-56 py-1 rounded-lg border border-border bg-card shadow-xl max-h-48 overflow-y-auto"
          style={{ top: pageLinkPos.top, left: pageLinkPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const q = pageLinkQuery.toLowerCase();
            const matches = allPages.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 10);
            return matches.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground/60">No pages found</div>
            ) : (
              matches.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => {
                    // Replace [[query with a link to the page
                    const { from } = editor!.state.selection;
                    const $pos = editor!.state.doc.resolve(from);
                    const nodeStart = $pos.start();
                    const textBefore = editor!.state.doc.textBetween(nodeStart, from);
                    const bracketIdx = textBefore.lastIndexOf('[[');
                    if (bracketIdx >= 0) {
                      editor!
                        .chain()
                        .focus()
                        .deleteRange({ from: nodeStart + bracketIdx, to: from })
                        .setLink({ href: `/page/${p.id}` })
                        .insertContent(p.title)
                        .run();
                    }
                    setShowPageLink(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left ${i === pageLinkIndex ? 'bg-muted' : ''}`}
                >
                  <span className="text-xs">{p.icon || '📄'}</span>
                  <span className="truncate flex-1">{p.title}</span>
                  <span className="text-[10px] text-muted-foreground/60 shrink-0">link</span>
                </button>
              ))
            );
          })()}
        </div>
      )}

      {/* Emoji picker popup */}
      {emojiOpen && (
        <div
          className="fixed z-100 w-56 py-1.5 rounded-lg border border-border bg-[#161616] shadow-2xl overflow-hidden"
          style={{ top: emojiPos.top, left: emojiPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {emojiQuery && (
            <div className="px-3 py-1 text-[10px] text-muted-foreground/60 font-mono">
              :{emojiQuery} — {filteredEmoji.length} match{filteredEmoji.length !== 1 ? 'es' : ''}
            </div>
          )}
          {filteredEmoji.length === 0 && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              No emoji found
            </div>
          )}
          <div className="grid grid-cols-6 gap-0.5 px-1.5 py-1">
            {filteredEmoji.map(([emoji, name], i) => (
              <button
                key={name}
                onClick={() => executeEmojiSelect(i)}
                onMouseEnter={() => setEmojiIndex(i)}
                className={cn(
                  'w-full aspect-square flex items-center justify-center text-lg rounded transition-colors',
                  i === emojiIndex ? 'bg-muted' : 'hover:bg-muted/50',
                )}
                title={`:${name}:`}
              >
                {emoji}
              </button>
            ))}
          </div>
          {filteredEmoji.length > 6 && (
            <div className="flex items-center gap-4 px-4 h-6 border-t border-border text-[9px] text-muted-foreground">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
              <span className="ml-auto">
                {emojiIndex + 1}/{filteredEmoji.length}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Slash command popup */}
      {slashOpen && editor && (
        <div
          className="fixed z-100 w-64 py-1.5 rounded-lg border border-border bg-[#161616] shadow-2xl overflow-hidden"
          style={{ top: slashPos.top, left: slashPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {filteredCommands.length === 0 && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">No results</div>
          )}
          {filteredCommands.map((item, i) => (
            <button
              key={item.title}
              onClick={() => executeSlashCommand(i)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                i === slashIndex ? 'bg-muted' : 'hover:bg-muted/50',
              )}
            >
              <span className="w-8 h-8 rounded flex items-center justify-center bg-muted text-xs font-mono text-muted-foreground shrink-0">
                {item.icon}
              </span>
              <div>
                <div className="text-sm font-medium text-foreground">{item.title}</div>
                <div className="text-[11px] text-muted-foreground">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-lg p-6 rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              {[
                [
                  'Navigation',
                  [
                    ['Go back', '⌫ or click Back'],
                    ['Open page', 'Click in sidebar'],
                    ['Home', 'Click Spacetime Wiki logo'],
                  ],
                ],
                [
                  'Editor',
                  [
                    ['Bold', 'Cmd+B'],
                    ['Italic', 'Cmd+I'],
                    ['Underline', 'Cmd+U'],
                    ['Strikethrough', 'Cmd+Shift+X'],
                    ['Heading 1', 'Cmd+Alt+1'],
                    ['Heading 2', 'Cmd+Alt+2'],
                    ['Heading 3', 'Cmd+Alt+3'],
                    ['Bullet list', 'Cmd+Shift+8'],
                    ['Ordered list', 'Cmd+Shift+7'],
                    ['Blockquote', 'Cmd+Shift+B'],
                    ['Code block', 'Cmd+Alt+C'],
                    ['Save', 'Cmd+S'],
                  ],
                ],
                [
                  'Slash Commands',
                  [
                    ['Open menu', 'Type / at start of line'],
                    ['Navigate', '↑ ↓'],
                    ['Select', 'Enter'],
                    ['Close', 'Escape'],
                  ],
                ],
                [
                  'Page Actions',
                  [
                    ['Edit page', 'Click Edit icon'],
                    ['Publish', 'Click Publish button'],
                    ['Archive', 'Click Archive button'],
                    ['View history', 'Click History icon'],
                    ['Duplicate', 'Click Copy icon'],
                  ],
                ],
              ].map(([section, items]) => (
                <div key={section as string}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {section}
                  </h3>
                  <div className="space-y-1">
                    {(items as string[][]).map(([label, key]) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">
                          {key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImages && (
        <React.Suspense fallback={null}>
          <ImageLightbox
            images={lightboxImages}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxImages(null)}
            pageId={page?.id}
          />
        </React.Suspense>
      )}
    </div>
  );
}
