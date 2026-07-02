import { useState, useEffect, useRef } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { api, PageTag } from "../lib/api";
import { cn } from "../lib/utils";

interface Props {
  pageId: string;
  editable?: boolean;
  userId?: string | null;
}

const TAG_COLORS = [
  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "bg-green-500/10 text-green-400 border-green-500/20",
  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "bg-red-500/10 text-red-400 border-red-500/20",
];

function tagColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function PageTags({ pageId, editable = false, userId }: Props) {
  const [tags, setTags] = useState<PageTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load tags
  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    api.tags.list(pageId).then((rows) => {
      setTags(rows);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [pageId]);

  // Load all tags for autocomplete
  const [allTags, setAllTags] = useState<string[]>([]);
  useEffect(() => {
    if (!editable) return;
    // Get all unique tag names across all pages
    api.tags.list(pageId).then(() => {
      // We need a query to get all distinct tag names
      // Use generic STDB query
      fetch(`http://127.0.0.1:3001/v1/database/c20000000000000000000000000000000000000000000000000000000000000000/sql`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "SELECT DISTINCT name FROM page_tag",
      })
        .then((res) => res.json())
        .then((data) => {
          const names = ((data[0]?.rows || []) as unknown[][]).map((r) => String(r[0]));
          setAllTags(names);
        })
        .catch(() => {});
    });
  }, [pageId, editable]);

  // Update suggestions as user types
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    const q = inputValue.toLowerCase();
    const existingNames = tags.map(t => t.name.toLowerCase());
    setSuggestions(
      allTags.filter(
        (name) => name.toLowerCase().includes(q) && !existingNames.includes(name.toLowerCase())
      ).slice(0, 5)
    );
  }, [inputValue, allTags, tags]);

  const addTag = async (name: string) => {
    const clean = name.trim().toLowerCase();
    if (!clean || tags.some(t => t.name === clean)) return;
    try {
      await api.tags.add(pageId, clean, "");
      const updated = await api.tags.list(pageId);
      setTags(updated);
    } catch (e) {
      console.error("Failed to add tag:", e);
    }
    setInputValue("");
    setSuggestions([]);
    setAdding(false);
  };

  const removeTag = async (tagId: string) => {
    try {
      await api.tags.remove(tagId);
      setTags(prev => prev.filter(t => t.id !== tagId));
    } catch (e) {
      console.error("Failed to remove tag:", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Escape") {
      setAdding(false);
      setInputValue("");
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
            tagColor(tag.name),
          )}
        >
          {tag.name}
          {editable && userId && (
            <button
              onClick={() => removeTag(tag.id)}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
      ))}
      {editable && userId && (
        <>
          {adding ? (
            <div className="relative inline-flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => { setAdding(false); setInputValue(""); }, 200)}
                placeholder="Add tag..."
                autoFocus
                className="h-6 w-28 px-2 rounded-full border border-border bg-[#0a0a0a] text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-40 py-1 rounded-lg border border-border bg-card shadow-xl z-30">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      onMouseDown={(e) => { e.preventDefault(); addTag(name); }}
                      className="w-full px-3 py-1 text-xs text-left text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 border border-dashed border-border/50 transition-colors"
            >
              <Plus className="h-2.5 w-2.5" /> Add tag
            </button>
          )}
        </>
      )}
    </div>
  );
}
