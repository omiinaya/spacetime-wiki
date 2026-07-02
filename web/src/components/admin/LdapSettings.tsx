import { useState, useEffect, useCallback } from "react";
import { api, LdapProvider } from "../../lib/api";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

export function LdapSettings({ userId }: { userId: string | null }) {
  const [providers, setProviders] = useState<LdapProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ldapName, setLdapName] = useState("");
  const [ldapSlug, setLdapSlug] = useState("");
  const [ldapHost, setLdapHost] = useState("");
  const [ldapPort, setLdapPort] = useState(389);
  const [ldapSecure, setLdapSecure] = useState(true);
  const [ldapBindDn, setLdapBindDn] = useState("");
  const [ldapBindPw, setLdapBindPw] = useState("");
  const [ldapBaseDn, setLdapBaseDn] = useState("");
  const [ldapFilter, setLdapFilter] = useState("(uid={{username}})");
  const [ldapUserAttr, setLdapUserAttr] = useState("uid");
  const [ldapEmailAttr, setLdapEmailAttr] = useState("mail");
  const [ldapNameAttr, setLdapNameAttr] = useState("cn");
  const [ldapDefaultRole, setLdapDefaultRole] = useState("member");
  const [ldapAutoReg, setLdapAutoReg] = useState(true);
  const [ldapActive, setLdapActive] = useState(true);
  const [testStatus, setTestStatus] = useState("");
  const [testResult, setTestResult] = useState("");
  const [error, setError] = useState("");

  const loadProviders = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const list = await api.ldap.list();
      setProviders(list);
    } catch (e) { console.error("Failed to load LDAP providers:", e); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const openAdd = () => {
    setEditingId(null);
    setLdapName(""); setLdapSlug(""); setLdapHost(""); setLdapPort(389);
    setLdapSecure(true); setLdapBindDn(""); setLdapBindPw("");
    setLdapBaseDn(""); setLdapFilter("(uid={{username}})"); setLdapUserAttr("uid");
    setLdapEmailAttr("mail"); setLdapNameAttr("cn"); setLdapDefaultRole("member");
    setLdapAutoReg(true); setLdapActive(true);
    setTestStatus(""); setTestResult(""); setError("");
    setDialogOpen(true);
  };

  const openEdit = (p: LdapProvider) => {
    setEditingId(p.id);
    setLdapName(p.name); setLdapSlug(p.slug); setLdapHost(p.host);
    setLdapPort(p.port); setLdapSecure(p.is_secure); setLdapBindDn(p.bind_dn);
    setLdapBindPw(""); setLdapBaseDn(p.base_dn); setLdapFilter(p.user_filter);
    setLdapUserAttr(p.username_attribute); setLdapEmailAttr(p.email_attribute);
    setLdapNameAttr(p.name_attribute); setLdapDefaultRole(p.default_role);
    setLdapAutoReg(p.auto_register); setLdapActive(p.is_active);
    setTestStatus(""); setTestResult(""); setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!ldapName.trim() || !ldapHost.trim() || !ldapBaseDn.trim()) {
      setError("Name, host, and base DN are required");
      return;
    }
    setError("");
    const provider = {
      name: ldapName.trim(), slug: ldapSlug.trim() || ldapName.trim().toLowerCase().replace(/\s+/g, "-"),
      host: ldapHost.trim(), port: ldapPort, is_secure: ldapSecure,
      bind_dn: ldapBindDn, bind_password: ldapBindPw,
      base_dn: ldapBaseDn.trim(), user_filter: ldapFilter,
      username_attribute: ldapUserAttr, email_attribute: ldapEmailAttr,
      name_attribute: ldapNameAttr, default_role: ldapDefaultRole,
      auto_register: ldapAutoReg,
    };
    try {
      if (editingId) {
        await api.ldap.update(editingId, { ...provider, is_active: ldapActive });
      } else {
        await api.ldap.add(provider, userId || "");
      }
      setDialogOpen(false);
      await loadProviders();
    } catch (err: any) { setError(`Failed to save: ${err.message || err}`); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">LDAP Directory Providers</p>
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
                {p.name}
                {p.is_active ? (
                  <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Disabled</span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground/60 truncate">{p.host}:{p.port} · {p.base_dn}</p>
            </div>
            <button onClick={() => openEdit(p)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Pencil className="h-3 w-3" />
            </button>
            <button onClick={async () => {
              if (!confirm(`Delete LDAP provider "${p.name}"?`)) return;
              await api.ldap.delete(p.id);
              setProviders(prev => prev.filter(x => x.id !== p.id));
            }} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {providers.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No LDAP providers configured. Add one to enable LDAP authentication.
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-border">
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground">How it works</h4>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          Configure an LDAP server (OpenLDAP, Active Directory, FreeIPA, etc.).
          Users will see a <strong className="text-foreground">"Sign in with LDAP"</strong> section on the login page.
          The system binds to LDAP using the service account, searches for the user,
          then authenticates them with their LDAP password.
        </p>
      </div>

      {/* Add/Edit dialog */}
      {dialogOpen && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60"
             onClick={() => setDialogOpen(false)}>
          <div className="dialog-container w-full max-w-lg mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">{editingId ? "Edit LDAP Provider" : "Add LDAP Provider"}</h3>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Name</label>
                  <input type="text" value={ldapName} onChange={e => setLdapName(e.target.value)}
                    placeholder="Company LDAP" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Slug</label>
                  <input type="text" value={ldapSlug} onChange={e => setLdapSlug(e.target.value)}
                    placeholder="company-ldap" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              {/* Connection */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Host</label>
                  <input type="text" value={ldapHost} onChange={e => setLdapHost(e.target.value)}
                    placeholder="ldap.example.com" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Port</label>
                  <input type="number" value={ldapPort} onChange={e => setLdapPort(parseInt(e.target.value) || 389)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ldapSecure} onChange={e => setLdapSecure(e.target.checked)}
                  className="rounded border-border" />
                <span className="text-[10px] text-muted-foreground/80">Use LDAPS (SSL/TLS)</span>
              </label>

              {/* Bind credentials */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Bind DN (service account, leave empty for anonymous bind)</label>
                <input type="text" value={ldapBindDn} onChange={e => setLdapBindDn(e.target.value)}
                  placeholder="cn=admin,dc=example,dc=com" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Bind Password</label>
                <input type="password" value={ldapBindPw} onChange={e => setLdapBindPw(e.target.value)}
                  placeholder={editingId ? "(leave empty to keep existing)" : "Bind password"}
                  className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
              </div>

              {/* Directory search */}
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Base DN</label>
                <input type="text" value={ldapBaseDn} onChange={e => setLdapBaseDn(e.target.value)}
                  placeholder="dc=example,dc=com" className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">
                  User Filter (<code className="bg-muted px-1">{"{{username}}"}</code> is replaced with login input)
                </label>
                <input type="text" value={ldapFilter} onChange={e => setLdapFilter(e.target.value)}
                  placeholder='(uid={{username}})' className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
              </div>

              {/* Attribute mapping */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Username attr</label>
                  <input type="text" value={ldapUserAttr} onChange={e => setLdapUserAttr(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Email attr</label>
                  <input type="text" value={ldapEmailAttr} onChange={e => setLdapEmailAttr(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Name attr</label>
                  <input type="text" value={ldapNameAttr} onChange={e => setLdapNameAttr(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 mb-1 block">Default role</label>
                  <select value={ldapDefaultRole} onChange={e => setLdapDefaultRole(e.target.value)}
                    className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                {editingId && (
                  <div>
                    <label className="text-[10px] text-muted-foreground/60 mb-1 block">Status</label>
                    <select value={ldapActive ? "true" : "false"} onChange={e => setLdapActive(e.target.value === "true")}
                      className="w-full h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50">
                      <option value="true">Active</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={ldapAutoReg} onChange={e => setLdapAutoReg(e.target.checked)}
                  className="rounded border-border" />
                <span className="text-[10px] text-muted-foreground/80">Auto-register new users on first LDAP login</span>
              </label>
            </div>

            {/* Test connection placeholder */}
            {testStatus && (
              <div className="mt-3 px-3 py-2 rounded-md text-xs bg-blue-500/10 text-blue-400">{testStatus}</div>
            )}
            {testResult && (
              <div className="mt-2 px-3 py-2 rounded-md text-xs bg-green-500/10 text-green-400">{testResult}</div>
            )}

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
