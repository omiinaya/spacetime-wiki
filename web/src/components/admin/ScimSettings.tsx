import { useState, useEffect, useCallback } from 'react';
import { api, ScimProvider, ScimEvent } from '../../lib/api';
import { useToast } from '../Toast';
import { Plus, Pencil, Trash2, ChevronDown, History, Loader2 } from 'lucide-react';

export function ScimSettings({ userId }: { userId: string | null }) {
  const [providers, setProviders] = useState<ScimProvider[]>([]);
  const [events, setEvents] = useState<ScimEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScimProvider | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [defaultRole, setDefaultRole] = useState('member');
  const [autoRegister, setAutoRegister] = useState(true);
  const [deprovisionBehavior, setDeprovisionBehavior] = useState('deactivate');
  const [syncGroups, setSyncGroups] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([api.scim.listProviders(), api.scim.listEvents()]);
      setProviders(p);
      setEvents(e);
    } catch (err) {
      console.error('Failed to load SCIM data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) return;
    try {
      if (editing) {
        await api.scim.updateProvider(
          editing.id,
          name,
          slug,
          apiToken,
          defaultRole,
          autoRegister,
          deprovisionBehavior,
          syncGroups,
          true,
        );
      } else {
        await api.scim.addProvider(
          name,
          slug,
          apiToken,
          defaultRole,
          autoRegister,
          deprovisionBehavior,
          syncGroups,
          userId || 'admin',
        );
      }
      setDialogOpen(false);
      setEditing(null);
      resetForm();
      await loadProviders();
    } catch (err) {
      console.error('Failed to save SCIM provider:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SCIM provider? Events will also be deleted.')) return;
    try {
      await api.scim.deleteProvider(id);
      await loadProviders();
    } catch (err) {
      console.error('Failed to delete SCIM provider:', err);
    }
  };

  const resetForm = () => {
    setName('');
    setSlug('');
    setApiToken('');
    setDefaultRole('member');
    setAutoRegister(true);
    setDeprovisionBehavior('deactivate');
    setSyncGroups(true);
  };

  const openEdit = (p: ScimProvider) => {
    setEditing(p);
    setName(p.name);
    setSlug(p.slug);
    setApiToken('');
    setDefaultRole(p.default_role);
    setAutoRegister(p.auto_register);
    setDeprovisionBehavior(p.deprovision_behavior);
    setSyncGroups(p.sync_groups);
    setDialogOpen(true);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          SCIM 2.0 Identity Providers
        </p>
        <button
          onClick={() => {
            setEditing(null);
            resetForm();
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add Provider
        </button>
      </div>

      {/* Provider list */}
      <div className="space-y-2 mb-4">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate flex items-center gap-2">
                {p.name}
                {p.is_active ? (
                  <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Disabled
                  </span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground/60 truncate">
                Slug: /{p.slug} | Role: {p.default_role} | Deprovision: {p.deprovision_behavior}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedProviderId(selectedProviderId === p.id ? null : p.id);
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {selectedProviderId === p.id ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <History className="h-3 w-3" />
              )}
            </button>
            <button
              onClick={() => openEdit(p)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleDelete(p.id)}
              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {providers.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No SCIM providers configured. Add one to enable identity provisioning via Okta, Azure
            AD, etc.
          </div>
        )}
      </div>

      {/* SCIM endpoint info */}
      {providers.filter((p) => p.is_active).length > 0 && (
        <div className="p-3 rounded-md bg-primary/5 border border-primary/20 mb-4">
          <h4 className="text-xs font-semibold mb-1">SCIM Endpoint</h4>
          <p className="text-[10px] text-muted-foreground/60 mb-1">
            Configure your identity provider to call:
          </p>
          <code className="block bg-muted px-2 py-1 rounded text-[10px] font-mono break-all">
            {window.location.origin}/scim/v2
          </code>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Use the API token configured above as a Bearer token in the Authorization header.
          </p>
        </div>
      )}

      {/* Event log */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Provisioning Events
        </p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {events.slice(0, 50).map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 text-[10px] px-2 py-1 rounded hover:bg-muted/30"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  e.status === 'success'
                    ? 'bg-emerald-500'
                    : e.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                }`}
              />
              <span className="text-muted-foreground/60 font-mono">
                {new Date(e.created_at).toLocaleString()}
              </span>
              <span className="font-medium">{e.operation}</span>
              <span className="text-muted-foreground/60">{e.resource_type}</span>
              <span className="text-muted-foreground/50 truncate flex-1">{e.detail}</span>
            </div>
          ))}
          {events.length === 0 && (
            <div className="py-2 text-center text-[10px] text-muted-foreground/50">
              No events yet
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit dialog */}
      {dialogOpen && (
        <div
          className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="dialog-container w-full max-w-md mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-4">
              {editing ? 'Edit SCIM Provider' : 'Add SCIM Provider'}
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Provider name (e.g. Okta)"
                  autoFocus
                  className="flex-1 h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                />
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="slug"
                  className="w-24 h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <input
                type="text"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder={
                  editing
                    ? 'New API token (leave empty to keep current)'
                    : 'API token for SCIM Bearer auth'
                }
                className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              />
              <div className="flex gap-2">
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                >
                  <option value="member">Default role: Member</option>
                  <option value="viewer">Default role: Viewer</option>
                  <option value="admin">Default role: Admin</option>
                </select>
                <select
                  value={deprovisionBehavior}
                  onChange={(e) => setDeprovisionBehavior(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                >
                  <option value="deactivate">Deprovision: Deactivate</option>
                  <option value="delete">Deprovision: Delete</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRegister}
                    onChange={(e) => setAutoRegister(e.target.checked)}
                    className="rounded border-border bg-[#0a0a0a] text-primary focus:ring-primary/50"
                  />
                  <span className="text-[10px] text-muted-foreground">Auto-register users</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncGroups}
                    onChange={(e) => setSyncGroups(e.target.checked)}
                    className="rounded border-border bg-[#0a0a0a] text-primary focus:ring-primary/50"
                  />
                  <span className="text-[10px] text-muted-foreground">Sync groups</span>
                </label>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || !slug.trim() || (!editing && !apiToken.trim())}
                  className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {editing ? 'Update' : 'Add'} Provider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
