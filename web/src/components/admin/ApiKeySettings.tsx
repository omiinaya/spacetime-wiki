import { useState, useEffect } from "react";
import { api, ApiKey } from "../../lib/api";
import { Loader2, Key } from "lucide-react";

export function ApiKeySection({ userId }: { userId: string | null }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [keyExpiry, setKeyExpiry] = useState(0);
  const [newKey, setNewKey] = useState<{ key: string; prefix: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) api.apiKeys.list(userId).then(setKeys).catch(() => {});
  }, [userId]);

  const handleCreate = async () => {
    if (!keyName.trim() || !userId) return;
    setLoading(true);
    try {
      // Generate a key client-side
      const arr = new Uint8Array(32);
      crypto.getRandomValues(arr);
      const key = "sw_" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
      const prefix = key.slice(0, 12);
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));
      await api.apiKeys.create(userId, keyName, hash, prefix, keyExpiry);
      setNewKey({ key, prefix });
      setKeyName("");
      const updated = await api.apiKeys.list(userId);
      setKeys(updated);
    } catch (e) { alert(String(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-2">
      {keys.map(k => (
        <div key={k.id} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs">
          <Key className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate">{k.name}</span>
          <span className="text-[10px] text-muted-foreground/60 font-mono">{k.key_prefix}...</span>
          <button onClick={async () => { await api.apiKeys.revoke(k.id); setKeys(prev => prev.filter(x => x.id !== k.id)); }}
            className="text-red-400 hover:text-red-300 text-[10px]">Revoke</button>
        </div>
      ))}
      {newKey && (
        <div className="p-2 rounded-md bg-green-500/10 border border-green-500/20">
          <p className="text-[10px] text-green-500 font-medium mb-1">New API key created — copy it now:</p>
          <input readOnly value={newKey.key} onClick={(e) => (e.target as HTMLInputElement).select()}
            className="w-full h-7 px-2 rounded border border-border bg-[#0a0a0a] text-[10px] font-mono text-foreground" />
          <p className="text-[10px] text-muted-foreground/60 mt-1">This key won't be shown again.</p>
        </div>
      )}
      <div className="flex gap-2">
        <input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Key name"
          className="flex-1 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
        <input type="number" value={keyExpiry} onChange={(e) => setKeyExpiry(parseInt(e.target.value) || 0)} min={0} placeholder="Days"
          className="w-14 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
        <button onClick={handleCreate} disabled={loading}
          className="h-7 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
        </button>
      </div>
    </div>
  );
}
