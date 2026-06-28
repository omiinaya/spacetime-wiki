import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useToast } from "../Toast";
import { Loader2, Trash2 } from "lucide-react";

export function TrashSettings() {
  const [days, setDays] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const { addToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const [retention, deleted] = await Promise.all([
          api.settings.getTrashRetentionDays(),
          api.pages.listDeleted(),
        ]);
        setDays(retention);
        setTrashCount(deleted.length);
      } catch (e) {
        console.error("Failed to load trash settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.settings.setTrashRetentionDays(days);
      addToast({ type: "success", title: "Saved", message: `Trash retention set to ${days > 0 ? `${days} days` : "immediate purge (no retention)"}`, duration: 3000 });
    } catch (e) {
      addToast({ type: "error", title: "Failed to save", message: String(e), duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeNow = async () => {
    if (!confirm(`Permanently delete all trash pages older than ${days > 0 ? `${days} day(s)` : "any age"}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await api.settings.purgeExpiredTrash();
      addToast({ type: "success", title: "Purged", message: "Expired trash pages deleted permanently", duration: 3000 });
      const deleted = await api.pages.listDeleted();
      setTrashCount(deleted.length);
    } catch (e) {
      addToast({ type: "error", title: "Purge failed", message: String(e), duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-md border border-border bg-muted/10">
        <p className="text-xs text-muted-foreground mb-1">
          Currently <strong className="text-foreground">{trashCount} page(s)</strong> in trash
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          {days > 0
            ? `Pages stay in trash for ${days} day(s) before auto-purge.`
            : "Trash is purged immediately on \"Empty trash\" action (no retention window)."}
        </p>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground/60 font-medium mb-1 block">
          Auto-purge after N days (0 = manual only)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Math.max(0, parseInt(e.target.value) || 0))}
            min={0}
            max={365}
            className="w-24 h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 transition-colors"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <button
          onClick={handlePurgeNow}
          disabled={saving || trashCount === 0}
          className="w-full h-8 rounded-md text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Purge expired trash now
        </button>
      </div>
    </div>
  );
}
