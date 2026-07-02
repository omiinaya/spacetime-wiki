import { useMemo } from "react";
import { diffArrays } from "diff";
import { cn, formatDate } from "../lib/utils";
import type { PageRevision } from "../lib/api";

interface Props {
  /** The "old" revision (base) */
  oldRev: PageRevision;
  /** The "new" revision (compared against) */
  newRev: PageRevision;
  onClose: () => void;
}

// ─── Tiptap JSON to plain text ───────────────────────────────────────────────

function tiptapToPlain(doc: any): string {
  const parts: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.type === "text") {
      parts.push(node.text || "");
    }
    if (node.content) {
      for (const child of node.content) walk(child);
    }
    if (
      node.type === "paragraph" ||
      node.type === "heading" ||
      node.type === "codeBlock" ||
      node.type === "blockquote" ||
      node.type === "callout" ||
      node.type === "listItem"
    ) {
      parts.push("\n");
    }
    if (node.type === "horizontalRule") {
      parts.push("\n---\n");
    }
  }
  walk(doc);
  return parts.join("");
}

function tryParseTiptap(json: string): any {
  try {
    const parsed = JSON.parse(json);
    if (parsed && parsed.type === "doc") return parsed;
  } catch {
    // Not valid JSON — treat as plain text
  }
  return null;
}

function contentToLines(content: string): string[] {
  const doc = tryParseTiptap(content);
  if (doc) {
    return tiptapToPlain(doc).split("\n");
  }
  // Fallback: treat as plain text
  return content.split("\n");
}

// ─── Diff line types ─────────────────────────────────────────────────────────

type DiffLine =
  | { kind: "added"; text: string }
  | { kind: "removed"; text: string }
  | { kind: "unchanged"; text: string };

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  const changes = diffArrays(oldLines, newLines);

  for (const change of changes) {
    const lines = change.value as string[];
    if (change.added) {
      for (const line of lines) {
        result.push({ kind: "added", text: line });
      }
    } else if (change.removed) {
      for (const line of lines) {
        result.push({ kind: "removed", text: line });
      }
    } else {
      for (const line of lines) {
        result.push({ kind: "unchanged", text: line });
      }
    }
  }

  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RevisionDiff({ oldRev, newRev, onClose }: Props) {
  const oldLines = useMemo(() => contentToLines(oldRev.content), [oldRev.content]);
  const newLines = useMemo(() => contentToLines(newRev.content), [newRev.content]);

  const diffs = useMemo(() => computeDiff(oldLines, newLines), [oldLines, newLines]);

  const titleChanged = oldRev.title !== newRev.title;

  const addedCount = diffs.filter((d) => d.kind === "added").length;
  const removedCount = diffs.filter((d) => d.kind === "removed").length;

  return (
    <div className="fixed inset-y-0 right-0 w-xl bg-sidebar border-l border-border z-30 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 bg-sidebar z-10 border-b border-border">
        <div className="flex items-center justify-between px-4 h-12">
          <h3 className="text-sm font-semibold">Changes</h3>
          <button
            onClick={onClose}
            aria-label="Close diff panel"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Revision metadata */}
        <div className="px-4 pb-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px]">
              v{oldRev.revision_number}
            </span>
            <span>{formatDate(oldRev.created_at)}</span>
          </div>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-mono text-[10px]">
              v{newRev.revision_number}
            </span>
            <span>{formatDate(newRev.created_at)}</span>
          </div>
        </div>
        {/* Stats bar */}
        <div className="px-4 pb-3 flex items-center gap-3 text-[10px]">
          <span className="text-green-400">
            +{addedCount} addition{addedCount !== 1 ? "s" : ""}
          </span>
          <span className="text-red-400">
            -{removedCount} removal{removedCount !== 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground">
            {diffs.length} total lines
          </span>
        </div>
      </div>

      {/* Diff body */}
      <div className="flex-1 overflow-y-auto">
        {/* Title diff */}
        {titleChanged && (
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Title changed
            </div>
            <div className="space-y-1">
              <div className="flex items-start gap-2 text-sm">
                <span className="shrink-0 w-4 h-4 mt-0.5 rounded bg-red-500/20 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </span>
                <span className="text-red-300 line-through">{oldRev.title}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <span className="shrink-0 w-4 h-4 mt-0.5 rounded bg-green-500/20 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
                <span className="text-green-300">{newRev.title}</span>
              </div>
            </div>
          </div>
        )}

        {/* Content diff */}
        <div className="py-2">
          {diffs.map((line, i) => {
            const bgColor =
              line.kind === "added"
                ? "bg-green-500/10"
                : line.kind === "removed"
                ? "bg-red-500/10"
                : "";
            const textColor =
              line.kind === "added"
                ? "text-green-300"
                : line.kind === "removed"
                ? "text-red-300"
                : "text-foreground/80";

            const prefix =
              line.kind === "added" ? (
                <span className="text-green-400 select-none shrink-0 w-5 text-center text-xs">+</span>
              ) : line.kind === "removed" ? (
                <span className="text-red-400 select-none shrink-0 w-5 text-center text-xs">−</span>
              ) : (
                <span className="text-muted-foreground/40 select-none shrink-0 w-5 text-center text-xs"> </span>
              );

            return (
              <div
                key={i}
                className={cn(
                  "flex items-start px-4 py-0.5 text-sm font-mono leading-relaxed",
                  bgColor
                )}
              >
                {prefix}
                <span className={cn("flex-1 whitespace-pre-wrap break-all", textColor)}>
                  {line.text || " "}
                </span>
              </div>
            );
          })}
          {diffs.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No differences found between these revisions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
