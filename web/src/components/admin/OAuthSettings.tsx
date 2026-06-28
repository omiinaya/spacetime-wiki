import { useState, useEffect, useCallback } from "react";
import { api, OauthProvider } from "../../lib/api";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

export function OAuthSettings({ userId }: { userId: string | null }) {
  const [providers, setProviders] = useState<OauthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [oaName, setOaName] = useState("");
  const [oaSlug, setOaSlug] = useState("");
  const [oaType, setOaType] = useState("github");
  const [oaAuthUrl, setOaAuthUrl] = useState("");
  const [oaTokenUrl, setOaTokenUrl] = useState("");
  const [oaUserUrl, setOaUserUrl] = useState("");
  const [oaScope, setOaScope] = useState("");
  const [oaClientId, setOaClientId] = useState("");
  const [oaClientSecret, setOaClientSecret] = useState("");
  const [oaIcon, setOaIcon] = useState("");
  const [oaAutoReg, setOaAutoReg] = useState(true);
  const [oaDefaultRole, setOaDefaultRole] = useState("member");
  const [oaActive, setOaActive] = useState(true);
  const [error, setError] = useState("");

  const loadProviders = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const list = await api.oauth.listAllProviders();
      setProviders(list);
    } catch (e) { console.error("Failed to load OAuth providers:", e); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const openAdd = () => {
    setEditingId(null);
    setOaName(""); setOaSlug(""); setOaType("github");
    setOaAuthUrl(""); setOaTokenUrl(""); setOaUserUrl("");
    setOaScope(""); setOaClientId(""); setOaClientSecret("");
    setOaIcon(""); setOaAutoReg(true); setOaDefaultRole("member"); setOaActive(true);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (p: OauthProvider) => {
    setEditingId(p.id);
    setOaName(p.name); setOaSlug(p.slug); setOaType(p.provider_type);
    setOaAuthUrl(p.authorize_url); setOaTokenUrl(p.token_url); setOaUserUrl(p.userinfo_url);
    setOaScope(p.scope); setOaClientId(p.client_id); setOaClientSecret("");
    setOaIcon(p.icon); setOaAutoReg(p.auto_register); setOaDefaultRole(p.default_role); setOaActive(p.is_active);
    setError("");
    setDialogOpen(true);
  };

  const getDefaultUrls = (type: string) => {
    const defaults: Record<string, { auth: string; token: string; userinfo: string; scope: string; icon: string }> = {
      github: {
        auth: "https://github.com/login/oauth/authorize",
        token: "https://github.com/login/oauth/access_token",
        userinfo: "https://api.github.com/user",
        scope: "read:user user:email",
        icon: "github",
      },
      discord: {
        auth: "https://discord.com/api/oauth2/authorize",
        token: "https://discord.com/api/oauth2/token",
        userinfo: "https://discord.com/api/users/@me",
        scope: "identify email",
        icon: "discord",
      },
      slack: {
        auth: "https://slack.com/openid/connect/authorize",
        token: "https://slack.com/api/openid.connect.token",
        userinfo: "https://slack.com/api/openid.connect.userInfo",
        scope: "openid email profile",
        icon: "slack",
      },
      gitlab: {
        auth: "https://gitlab.com/oauth/authorize",
        token: "https://gitlab.com/oauth/token",
        userinfo: "https://gitlab.com/api/v4/user",
        scope: "read_user",
        icon: "gitlab",
      },
    };
    return defaults[type] || { auth: "", token: "", userinfo: "", scope: "openid email profile", icon: type };
  };

  const handleTypeChange = (type: string) => {
    setOaType(type);
    const defaults = getDefaultUrls(type);
    if (!editingId) {
      setOaAuthUrl(defaults.auth);
      setOaTokenUrl(defaults.token);
      setOaUserUrl(defaults.userinfo);
      setOaScope(defaults.scope);
      setOaIcon(defaults.icon);
    }
  };

  const handleSave = async () => {
    if (!oaName.trim() || !oaClientId.trim()) {
      setError("Name and client ID are required");
      return;
    }
    if (!oaAuthUrl.trim() || !oaTokenUrl.trim() || !oaUserUrl.trim()) {
      setError("Authorize URL, token URL, and userinfo URL are required");
      return;
    }
    setError("");
    try {
      if (editingId) {
        await api.oauth.updateProvider(editingId, {
          name: oaName.trim(), slug: oaSlug.trim() || oaName.trim().toLowerCase().replace(/\s+/g, "-"),
          provider_type: oaType,
          authorize_url: oaAuthUrl.trim(), token_url: oaTokenUrl.trim(), userinfo_url: oaUserUrl.trim(),
          scope: oaScope, client_id: oaClientId.trim(), client_secret: oaClientSecret,
          icon: oaIcon || oaType, auto_register: oaAutoReg, default_role: oaDefaultRole, is_active: oaActive,
        });
      } else {
        await api.oauth.addProvider(
          oaName.trim(), oaSlug.trim() || oaName.trim().toLowerCase().replace(/\s+/g, "-"),
          oaType, oaAuthUrl.trim(), oaTokenUrl.trim(), oaUserUrl.trim(),
          oaScope, oaClientId.trim(), oaClientSecret, oaIcon || oaType, oaAutoReg, oaDefaultRole,
          userId || "",
        );
      }
      setDialogOpen(false);
      await loadProviders();
    } catch (err: any) { setError(`Failed to save: ${err.message || err}`); }
  };

  // Provider icon helper
  const providerIcon = (p: OauthProvider) => {
    const icons: Record<string, string> = {
      github: "🔑", discord: "💬", slack: "💎", gitlab: "🦊",
    };
    return icons[p.provider_type] || "🔗";
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OAuth Providers (Slack/Discord/GitHub/GitLab)</p>
        <button onClick={openAdd}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Plus className="h-3 w-3" /> Add Provider
        </button>
      </div>

      {error && <div className="mb-3 px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs">{error}</div>}

      <div className="space-y-2">
        {providers.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate flex items-center gap-2">
                <span className="text-sm">{providerIcon(p)}</span>
                {p.name}
                {p.is_active ? (
                  <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Disabled</span>
                )}
                <span className="text-[10px] text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded">{p.provider_type}</span>
              </p>
              <p className="text-[10px] text-muted-foreground/60 truncate">{p.authorize_url}</p>
            </div>
            <button onClick={() => openEdit(p)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={async () => {
              if (!confirm(`Delete OAuth provider "${p.name}"?`)) return;
              await api.oauth.deleteProvider(p.id);
              setProviders(prev => prev.filter(x => x.id !== p.id));
            }} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {providers.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No OAuth providers configured. Add one to enable SSO login with Slack, Discord, GitHub, or GitLab.
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-border">
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">How it works</h4>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          Configure any OAuth 2.0 provider (Slack, Discord, GitHub, GitLab, or custom).
          Users will see a <strong className="text-foreground">"Sign in with {providers.find(p => p.is_active)?.name || "Provider"}"</strong> button on the login page.
          The callback URL is: <code className="bg-muted px-1 rounded">{window.location.origin}/oauth/callback</code>
        </p>
      </div>

      {/* Add/Edit dialog */}
      {dialogOpen && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60"
             onClick={() => setDialogOpen(false)}>
          <div className="dialog-container w-full max-w-lg mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">{editingId ? "Edit OAuth Provider" : "Add OAuth Provider"}</h3>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Name</label>
                  <input type="text" value={oaName} onChange={e => setOaName(e.target.value)}
                    placeholder="My GitHub" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Slug</label>
                  <input type="text" value={oaSlug} onChange={e => setOaSlug(e.target.value)}
                    placeholder="my-github" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              {/* Provider type selector */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Provider Type</label>
                <select value={oaType} onChange={e => handleTypeChange(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option value="github">GitHub</option>
                  <option value="discord">Discord</option>
                  <option value="slack">Slack</option>
                  <option value="gitlab">GitLab</option>
                  <option value="generic">Generic/OIDC</option>
                </select>
              </div>

              {/* URLs */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Authorize URL</label>
                <input type="text" value={oaAuthUrl} onChange={e => setOaAuthUrl(e.target.value)}
                  placeholder="https://github.com/login/oauth/authorize" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Token URL</label>
                  <input type="text" value={oaTokenUrl} onChange={e => setOaTokenUrl(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Userinfo URL</label>
                  <input type="text" value={oaUserUrl} onChange={e => setOaUserUrl(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              {/* Scope */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Scope (space-separated)</label>
                <input type="text" value={oaScope} onChange={e => setOaScope(e.target.value)}
                  placeholder="read:user user:email" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>

              {/* Client credentials */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Client ID</label>
                  <input type="text" value={oaClientId} onChange={e => setOaClientId(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Client Secret</label>
                  <input type="password" value={oaClientSecret} onChange={e => setOaClientSecret(e.target.value)}
                    placeholder={editingId ? "(leave empty to keep existing)" : "Required"}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Icon identifier</label>
                <input type="text" value={oaIcon} onChange={e => setOaIcon(e.target.value)}
                  placeholder="github" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Default role</label>
                  <select value={oaDefaultRole} onChange={e => setOaDefaultRole(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                {editingId && (
                  <div>
                    <label className="text-[10px] text-muted-foreground/60 mb-1 block">Status</label>
                    <select value={oaActive ? "true" : "false"} onChange={e => setOaActive(e.target.value === "true")}
                      className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="true">Active</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={oaAutoReg} onChange={e => setOaAutoReg(e.target.checked)}
                  className="rounded border-border" />
                <span className="text-[10px] text-muted-foreground/80">Auto-register new users on first OAuth login</span>
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-border mt-4">
              <button onClick={() => setDialogOpen(false)}
                className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleSave}
                className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
                {editingId ? "Save" : "Add Provider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
