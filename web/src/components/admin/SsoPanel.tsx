import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api, OidcProvider, SamlProvider } from "../../lib/api";

import type { ToastItem } from "../Toast";

interface SsoPanelProps {
  addToast: (t: Omit<ToastItem, "id">) => string;
}

export function SsoPanel({ addToast }: SsoPanelProps) {
  const [oidcProviders, setOidcProviders] = useState<OidcProvider[]>([]);
  const [oidcDialogOpen, setOidcDialogOpen] = useState(false);
  const [editingOidc, setEditingOidc] = useState<OidcProvider | null>(null);
  const [oidcName, setOidcName] = useState("");
  const [oidcSlug, setOidcSlug] = useState("");
  const [oidcIssuer, setOidcIssuer] = useState("");
  const [oidcClientId, setOidcClientId] = useState("");
  const [oidcClientSecret, setOidcClientSecret] = useState("");
  const [oidcScopes, setOidcScopes] = useState("openid email profile");

  const [samlProviders, setSamlProviders] = useState<SamlProvider[]>([]);
  const [samlDialogOpen, setSamlDialogOpen] = useState(false);
  const [editingSaml, setEditingSaml] = useState<SamlProvider | null>(null);
  const [samlName, setSamlName] = useState("");
  const [samlSlug, setSamlSlug] = useState("");
  const [samlEntityId, setSamlEntityId] = useState("");
  const [samlSsoUrl, setSamlSsoUrl] = useState("");
  const [samlCert, setSamlCert] = useState("");
  const [samlNameIdFmt, setSamlNameIdFmt] = useState("urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");
  const [samlAttrMapping, setSamlAttrMapping] = useState('{"email":"email","name":"name"}');
  const [samlAutoRegister, setSamlAutoRegister] = useState(true);

  // Load data on mount
  const loaded = useState(false);
  if (!loaded[0]) {
    loaded[1](true);
    api.oidc.list().then(setOidcProviders).catch(() => {});
    api.saml.list().then(setSamlProviders).catch(() => {});
  }

  const saveOidc = async () => {
    if (!oidcName.trim() || !oidcSlug.trim() || !oidcIssuer.trim() || !oidcClientId.trim()) return;
    try {
      if (editingOidc) {
        await api.oidc.update(editingOidc.id, oidcName, oidcSlug, oidcIssuer, oidcClientId, oidcClientSecret, oidcScopes, editingOidc.is_active);
        setOidcProviders(prev => prev.map(p => p.id === editingOidc.id ? { ...p, name: oidcName, slug: oidcSlug, issuer_url: oidcIssuer, client_id: oidcClientId, client_secret: oidcClientSecret, scopes: oidcScopes } : p));
      } else {
        const id = crypto.randomUUID();
        await api.oidc.create(oidcName, oidcSlug, oidcIssuer, oidcClientId, oidcClientSecret, oidcScopes, "admin");
        setOidcProviders(prev => [...prev, { id, name: oidcName, slug: oidcSlug, issuer_url: oidcIssuer, client_id: oidcClientId, client_secret: oidcClientSecret, scopes: oidcScopes, is_active: true, created_by: "admin", created_at: Date.now(), updated_at: Date.now() }]);
      }
      setOidcDialogOpen(false);
      setEditingOidc(null);
      resetOidcForm();
    } catch (e) {
      addToast({ type: "error", title: String(e), duration: 4000 });
    }
  };

  const resetOidcForm = () => {
    setOidcName(""); setOidcSlug(""); setOidcIssuer(""); setOidcClientId(""); setOidcClientSecret(""); setOidcScopes("openid email profile");
  };

  const saveSaml = async () => {
    if (!samlName.trim() || !samlSlug.trim() || !samlEntityId.trim() || !samlSsoUrl.trim()) return;
    try {
      if (editingSaml) {
        await api.saml.update(editingSaml.id, samlName, samlSlug, samlEntityId, samlSsoUrl, samlCert, samlNameIdFmt, samlAttrMapping, samlAutoRegister, editingSaml.is_active);
        setSamlProviders(prev => prev.map(p => p.id === editingSaml.id ? { ...p, name: samlName, slug: samlSlug, entity_id: samlEntityId, sso_url: samlSsoUrl, cert: samlCert, name_id_format: samlNameIdFmt, attribute_mapping: samlAttrMapping, auto_register: samlAutoRegister } : p));
      } else {
        const id = crypto.randomUUID();
        await api.saml.create(samlName, samlSlug, samlEntityId, samlSsoUrl, samlCert, samlNameIdFmt, samlAttrMapping, samlAutoRegister, "admin");
        setSamlProviders(prev => [...prev, { id, name: samlName, slug: samlSlug, entity_id: samlEntityId, sso_url: samlSsoUrl, certificate: samlCert, name_id_format: samlNameIdFmt, attribute_mapping: samlAttrMapping, auto_register: samlAutoRegister, is_active: true, created_by: "admin", created_at: Date.now(), updated_at: Date.now() }]);
      }
      setSamlDialogOpen(false);
      setEditingSaml(null);
      resetSamlForm();
    } catch (e) {
      addToast({ type: "error", title: String(e), duration: 4000 });
    }
  };

  const resetSamlForm = () => {
    setSamlName(""); setSamlSlug(""); setSamlEntityId(""); setSamlSsoUrl("");
    setSamlCert(""); setSamlNameIdFmt("urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");
    setSamlAttrMapping('{"email":"email","name":"name"}'); setSamlAutoRegister(true);
  };

  return (
    <>
      {/* OIDC Dialog */}
      {oidcDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setOidcDialogOpen(false)}>
          <div className="w-full max-w-sm mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xs font-semibold mb-3">{editingOidc ? "Edit OIDC Provider" : "Add OIDC Provider"}</h3>
            <input value={oidcName} onChange={e => setOidcName(e.target.value)} placeholder="Provider name" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={oidcSlug} onChange={e => setOidcSlug(e.target.value)} placeholder="Slug (e.g. keycloak)" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={oidcIssuer} onChange={e => setOidcIssuer(e.target.value)} placeholder="Issuer URL" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={oidcClientId} onChange={e => setOidcClientId(e.target.value)} placeholder="Client ID" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={oidcClientSecret} onChange={e => setOidcClientSecret(e.target.value)} placeholder="Client Secret" type="password" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={oidcScopes} onChange={e => setOidcScopes(e.target.value)} placeholder="Scopes (space-separated)" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-3 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOidcDialogOpen(false)} className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={saveOidc} className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{editingOidc ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* SAML Dialog */}
      {samlDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setSamlDialogOpen(false)}>
          <div className="w-full max-w-sm mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xs font-semibold mb-3">{editingSaml ? "Edit SAML Provider" : "Add SAML Provider"}</h3>
            <input value={samlName} onChange={e => setSamlName(e.target.value)} placeholder="Provider name" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={samlSlug} onChange={e => setSamlSlug(e.target.value)} placeholder="Slug" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={samlEntityId} onChange={e => setSamlEntityId(e.target.value)} placeholder="Entity ID / Issuer" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={samlSsoUrl} onChange={e => setSamlSsoUrl(e.target.value)} placeholder="SSO URL" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <textarea value={samlCert} onChange={e => setSamlCert(e.target.value)} placeholder="X.509 Certificate (PEM)" rows={3} className="w-full px-3 py-2 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono" />
            <input value={samlNameIdFmt} onChange={e => setSamlNameIdFmt(e.target.value)} placeholder="Name ID format" className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={samlAttrMapping} onChange={e => setSamlAttrMapping(e.target.value)} placeholder='Attribute mapping JSON' className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <label className="flex items-center gap-2 mb-3 text-xs">
              <input type="checkbox" checked={samlAutoRegister} onChange={e => setSamlAutoRegister(e.target.checked)} className="rounded" />
              Auto-register users
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSamlDialogOpen(false)} className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={saveSaml} className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">{editingSaml ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* OIDC Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OIDC Providers</p>
          <button onClick={() => { setEditingOidc(null); resetOidcForm(); setOidcDialogOpen(true); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Plus className="h-3 w-3" /> Add Provider
          </button>
        </div>
        <div className="space-y-2">
          {oidcProviders.map(p => (
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
                <p className="text-[10px] text-muted-foreground/60 truncate">{p.issuer_url}</p>
              </div>
              <button onClick={() => {
                setEditingOidc(p);
                setOidcName(p.name); setOidcSlug(p.slug); setOidcIssuer(p.issuer_url);
                setOidcClientId(p.client_id); setOidcClientSecret(""); setOidcScopes(p.scopes);
                setOidcDialogOpen(true);
              }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={async () => {
                if (!confirm(`Delete OIDC provider "${p.name}"?`)) return;
                await api.oidc.delete(p.id);
                setOidcProviders(prev => prev.filter(x => x.id !== p.id));
              }} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {oidcProviders.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">No OIDC providers configured.</div>
          )}
        </div>
        <div className="pt-4 mt-4 border-t border-border">
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">How it works</h4>
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            Configure any OpenID Connect provider (Keycloak, Okta, Auth0, Azure AD, etc.).
            The callback URL for all providers is: <code className="bg-muted px-1 rounded">{window.location.origin}/oauth/oidc/callback</code>
          </p>
        </div>
      </div>

      {/* SAML Section */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SAML 2.0 Providers</p>
          <button onClick={() => { setEditingSaml(null); resetSamlForm(); setSamlDialogOpen(true); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Plus className="h-3 w-3" /> Add Provider
          </button>
        </div>
        <div className="space-y-2">
          {samlProviders.map(p => (
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
                <p className="text-[10px] text-muted-foreground/60 truncate">Entity: {p.entity_id}</p>
              </div>
              <button onClick={() => {
                setEditingSaml(p);
                setSamlName(p.name); setSamlSlug(p.slug); setSamlEntityId(p.entity_id);
                setSamlSsoUrl(p.sso_url); setSamlCert(""); setSamlNameIdFmt(p.name_id_format);
                setSamlAttrMapping(p.attribute_mapping); setSamlAutoRegister(p.auto_register);
                setSamlDialogOpen(true);
              }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={async () => {
                if (!confirm(`Delete SAML provider "${p.name}"?`)) return;
                await api.saml.delete(p.id);
                setSamlProviders(prev => prev.filter(x => x.id !== p.id));
              }} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {samlProviders.length === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">No SAML providers configured.</div>
          )}
        </div>
        <div className="pt-4 mt-4 border-t border-border">
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">How it works</h4>
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            Configure any SAML 2.0 identity provider (Keycloak, Okta, Azure AD, ADFS, etc.).
            The ACS URL is: <code className="bg-muted px-1 rounded">{window.location.origin}/auth/saml/callback</code>
          </p>
        </div>
      </div>
    </>
  );
}
