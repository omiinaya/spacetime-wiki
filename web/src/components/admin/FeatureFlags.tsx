import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useToast } from "../Toast";
import { Loader2 } from "lucide-react";

export function FeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const FEATURES: { key: string; label: string; desc: string }[] = [
    { key: "callouts", label: "Callouts / Notices", desc: "Info, warning, tip, and danger callout blocks" },
    { key: "mermaid", label: "Mermaid Diagrams", desc: "Flowcharts, sequence diagrams, and Gantt charts" },
    { key: "math", label: "Math (LaTeX/KaTeX)", desc: "Inline and block mathematical equations" },
    { key: "embeds", label: "Rich Embeds", desc: "Embed content from YouTube, Figma, CodePen, Spotify, and 30+ providers" },
    { key: "video", label: "Video Embeds", desc: "YouTube, Vimeo, and Loom video embeds" },
    { key: "drawio", label: "Draw.io Diagrams", desc: "Draw.io / diagrams.net inline diagrams" },
    { key: "plantuml", label: "PlantUML Diagrams", desc: "PlantUML sequence and UML diagrams" },
    { key: "details", label: "Toggle Blocks", desc: "Collapsible details/summary toggle blocks" },
    { key: "mentions", label: "@Mentions", desc: "Mention users and pages with @ syntax" },
    { key: "database", label: "Database Bases", desc: "Table and kanban database views inside wiki pages" },
    { key: "syncedBlocks", label: "Synced Blocks", desc: "Reusable blocks that sync across pages — edit once, update everywhere" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const val = await api.settings.get("feature_flags");
        if (val) {
          const parsed = JSON.parse(val);
          setFlags(parsed);
        } else {
          // Default: all enabled
          const defaults: Record<string, boolean> = {};
          for (const f of FEATURES) defaults[f.key] = true;
          setFlags(defaults);
        }
      } catch (e) {
        console.error("Failed to load feature flags:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleFeature = async (key: string) => {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    setSaving(true);
    try {
      await api.settings.set("feature_flags", JSON.stringify(updated));
      addToast({ type: "success", title: "Feature updated", message: `"${FEATURES.find(f => f.key === key)?.label || key}" ${updated[key] ? "enabled" : "disabled"}`, duration: 2000 });
    } catch (e) {
      addToast({ type: "error", title: "Failed to save", message: String(e), duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const enabledCount = Object.values(flags).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editor Extensions</p>
        <span className="text-[10px] text-muted-foreground/60">{enabledCount}/{FEATURES.length} enabled</span>
      </div>
      <div className="p-3 rounded-md border border-border bg-muted/10">
        <p className="text-xs text-muted-foreground">
          Toggle editor features on or off. Disabled features will be removed from the editor toolbar,
          slash commands, and keyboard shortcuts. Content created with disabled features will still render
          correctly but cannot be modified.
        </p>
      </div>
      <div className="space-y-1">
        {FEATURES.map((feature) => (
          <div key={feature.key} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-muted/30 transition-colors">
            <button
              onClick={() => toggleFeature(feature.key)}
              className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${flags[feature.key] !== false ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${flags[feature.key] !== false ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{feature.label}</p>
              <p className="text-[10px] text-muted-foreground/60">{feature.desc}</p>
            </div>
            <span className={`text-[10px] font-medium ${flags[feature.key] !== false ? "text-emerald-500" : "text-muted-foreground"}`}>
              {flags[feature.key] !== false ? "ON" : "OFF"}
            </span>
          </div>
        ))}
      </div>
      {saving && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
        </div>
      )}
    </div>
  );
}
