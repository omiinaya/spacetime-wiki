import { useState, useEffect } from "react";
import { api, Webhook, WebhookEvent } from "../lib/api";
import { Plus, Trash2, Pencil, Loader2, Send, X, CheckCircle, AlertCircle, Clock, Eye } from "lucide-react";
import { cn, timeAgo } from "../lib/utils";

// ─── Event type options ───────────────────────────────────────────────────────

const EVENT_OPTIONS = [
  { value: "page.create", label: "Page created" },
  { value: "page.update", label: "Page updated" },
  { value: "page.delete", label: "Page deleted" },
  { value: "page.publish", label: "Page published" },
  { value: "page.archive", label: "Page archived" },
  { value: "comment.create", label: "Comment added" },
];

// ─── Webhook Settings ─────────────────────────────────────────────────────────

interface Props {
  userId: string | null;
}

export function WebhookSettings({ userId }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>(["page.create", "page.update"]);
  const [formSecret, setFormSecret] = useState("");
  const [saving, setSaving] = useState(false);

  // Events panel state
  const [showEvents, setShowEvents] = useState(false);
  const [eventsWebhookId, setEventsWebhookId] = useState<string | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);

  const loadWebhooks = async () => {
    try {
      const whs = await api.webhooks.list();
      setWebhooks(whs);
    } catch (e) {
      console.error("Failed to load webhooks:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormUrl("https://");
    setFormEvents(["page.create", "page.update"]);
    setFormSecret("");
    setShowForm(true);
  };

  const openEdit = (wh: Webhook) => {
    setEditingId(wh.id);
    setFormName(wh.name);
    setFormUrl(wh.url);
    try {
      setFormEvents(JSON.parse(wh.events));
    } catch {
      setFormEvents(["page.create"]);
    }
    setFormSecret(wh.secret);
    setShowForm(true);
  };

  const toggleEvent = (event: string) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) return;
    setSaving(true);
    try {
      const eventsJson = JSON.stringify(formEvents);
      if (editingId) {
        const wh = webhooks.find((w) => w.id === editingId);
        await api.webhooks.update(editingId, formName, formUrl, eventsJson, formSecret, wh?.is_active ?? true);
      } else {
        await api.webhooks.create(formName, formUrl, eventsJson, formSecret, userId || "anonymous");
      }
      setShowForm(false);
      await loadWebhooks();
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook? All pending events will be removed.")) return;
    await api.webhooks.delete(id);
    await loadWebhooks();
  };

  const handleToggleActive = async (wh: Webhook) => {
    await api.webhooks.update(wh.id, wh.name, wh.url, wh.events, wh.secret, !wh.is_active);
    await loadWebhooks();
  };

  const loadEvents = async (webhookId: string) => {
    setEventsLoading(true);
    setEventsWebhookId(webhookId);
    try {
      const evts = await api.webhooks.listEvents(webhookId);
      setEvents(evts);
      setShowEvents(true);
    } catch (e) {
      console.error("Failed to load events:", e);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleFireTest = async (wh: Webhook) => {
    const testPayload = JSON.stringify({
      event: "test",
      data: { message: "This is a test webhook event from Spacetime Wiki." },
      timestamp: Date.now(),
    });
    try {
      await api.webhooks.fire(wh.id, "page.create", "", testPayload);
      // Reload events if panel is open
      if (showEvents && eventsWebhookId === wh.id) {
        loadEvents(wh.id);
      }
    } catch (e) {
      alert(String(e));
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-yellow-500" />;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Webhooks</p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-3 w-3" /> New Webhook
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading...
        </div>
      ) : webhooks.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No webhooks configured. Webhooks send HTTP POST notifications when pages are created, updated, or deleted.
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-md border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                <button
                  onClick={() =>
                    expandedId === wh.id ? setExpandedId(null) : setExpandedId(wh.id)
                  }
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      wh.is_active ? "bg-green-500" : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="text-xs font-medium truncate">{wh.name}</span>
                  <span className="text-[10px] text-muted-foreground/60 truncate hidden sm:inline">
                    {wh.url}
                  </span>
                </button>
                <button
                  onClick={() => loadEvents(wh.id)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="View events"
                >
                  <Clock className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleFireTest(wh)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Fire test event"
                >
                  <Send className="h-3 w-3" />
                </button>
                <button
                  onClick={() => openEdit(wh)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDelete(wh.id)}
                  className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {expandedId === wh.id && (
                <div className="px-3 pb-2 border-t border-border space-y-2">
                  <div className="pt-2 grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-muted-foreground/60">URL:</span>
                      <span className="text-muted-foreground ml-1 break-all">{wh.url}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground/60">Status:</span>
                      <button
                        onClick={() => handleToggleActive(wh)}
                        className={cn(
                          "ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                          wh.is_active
                            ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                      >
                        {wh.is_active ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px]">
                    <span className="text-muted-foreground/60">Events:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(() => {
                        let parsed: string[];
                        try { parsed = JSON.parse(wh.events); } catch { parsed = []; }
                        return parsed;
                      })().map((evt) => (
                        <span
                          key={evt}
                          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>
                  </div>
                  {wh.secret && (
                    <div className="text-[10px]">
                      <span className="text-muted-foreground/60">Secret:</span>
                      <code className="ml-1 px-1 py-0.5 rounded bg-muted text-muted-foreground">
                        {wh.secret.slice(0, 16)}...
                      </code>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">{editingId ? "Edit webhook" : "New webhook"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Name</label>
                <input
                  type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="My webhook" autoFocus
                  className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">URL</label>
                <input
                  type="text" value={formUrl} onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://hooks.example.com/notify"
                  className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Events</label>
                <div className="grid grid-cols-2 gap-1">
                  {EVENT_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEvents.includes(opt.value)}
                        onChange={() => toggleEvent(opt.value)}
                        className="h-3 w-3 rounded border-border accent-primary"
                      />
                      <span className="text-xs text-muted-foreground">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">
                  Secret <span className="text-muted-foreground/40">(optional — sent as X-Webhook-Secret header)</span>
                </label>
                <input
                  type="text" value={formSecret} onChange={(e) => setFormSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowForm(false)} className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={!formName.trim() || !formUrl.trim() || saving}
                  className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : editingId ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events panel */}
      {showEvents && eventsWebhookId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowEvents(false); setEventsWebhookId(null); }}>
          <div className="w-full max-w-lg mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Webhook Events
              </h3>
              <button onClick={() => { setShowEvents(false); setEventsWebhookId(null); }} className="p-1 rounded hover:bg-muted" aria-label="Close events panel">
                <X className="h-4 w-4" />
              </button>
            </div>
            {eventsLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading...
              </div>
            ) : events.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No events yet. Events appear when the webhook is triggered.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((evt) => (
                  <div key={evt.id} className="p-3 rounded-md border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(evt.status)}
                      <span className="text-xs font-medium">{evt.event_type}</span>
                      <span className="text-[10px] text-muted-foreground/60 ml-auto">
                        {timeAgo(evt.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                      <span className={cn(
                        "px-1 py-0.5 rounded font-medium",
                        evt.status === "sent" && "bg-green-500/10 text-green-500",
                        evt.status === "failed" && "bg-red-500/10 text-red-500",
                        evt.status === "pending" && "bg-yellow-500/10 text-yellow-500",
                      )}>
                        {evt.status}
                      </span>
                      {evt.response_code > 0 && (
                        <span>HTTP {evt.response_code}</span>
                      )}
                    </div>
                    {evt.response_body && evt.response_body !== "{}" && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-muted-foreground/60 cursor-pointer hover:text-foreground">
                          <Eye className="h-2.5 w-2.5 inline mr-1" />Response
                        </summary>
                        <pre className="mt-1 p-2 rounded bg-[#0a0a0a] text-[10px] text-muted-foreground overflow-x-auto max-h-24">
                          {evt.response_body.slice(0, 500)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
