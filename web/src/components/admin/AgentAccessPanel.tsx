import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, KeyRound, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import { useToast } from '../Toast';

// ─── Hermes-ID Agent Access Panel ────────────────────────────────────────────
// Lists pending hermes-id agents requesting access to this project and lets a
// human admin approve/deny them. The wiki has no login JWT, so the panel uses
// an admin key (HERMES_ID_ADMIN_KEY) stored in sessionStorage and sent as the
// X-Admin-Key header on every call (mirrors the SpacetimeTV pattern).

interface HermesIdAgent {
  did: string;
  status: string;
  display_name: string;
  registered_at: string;
  updated_at: string | null;
  approved_at: string | null;
  metadata: Record<string, unknown>;
  projects: string[];
}

interface AgentListResponse {
  agents: HermesIdAgent[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

function fmtRegisteredAt(ts: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export function AgentAccessPanel() {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<HermesIdAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('adminKey') || '');
  const [pendingKey, setPendingKey] = useState('');
  const [actingDid, setActingDid] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const headers = useMemo<Record<string, string>>(
    () => (adminKey ? { 'X-Admin-Key': adminKey } : {}),
    [adminKey],
  );

  // Load pending agents. All state updates happen after an await so the
  // effect never sets state synchronously (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError('');
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/admin/hermes-id/agents?status=pending`,
          { headers },
        );
        if (cancelled) return;
        if (res.status === 403) {
          // Key missing/wrong — drop it so the key prompt reappears
          setAdminKey('');
          sessionStorage.removeItem('adminKey');
          throw new Error('Invalid or missing admin key — please re-enter it.');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as AgentListResponse;
        if (cancelled) return;
        setAgents(data.agents ?? []);
        setTotal(data.total ?? 0);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load agents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [headers, reloadNonce]);

  const submitKey = () => {
    sessionStorage.setItem('adminKey', pendingKey);
    setAdminKey(pendingKey);
    setPendingKey('');
  };

  const act = useCallback(
    async (did: string, action: 'approve' | 'deny') => {
      if (!window.confirm(`Are you sure you want to ${action} agent ${did}?`)) {
        return;
      }
      setActingDid(did);
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/admin/hermes-id/agents/${encodeURIComponent(did)}/${action}`,
          { method: 'POST', headers },
        );
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const body = (await res.json()) as { detail?: unknown };
            if (body.detail) detail = String(body.detail);
          } catch {
            // non-JSON error body — keep the HTTP status fallback
          }
          throw new Error(detail);
        }
        addToast({
          type: 'success',
          title: action === 'approve' ? 'Agent approved' : 'Agent denied',
          message: `${did} was ${action === 'approve' ? 'approved' : 'denied'}.`,
        });
        setAgents((prev) => prev.filter((a) => a.did !== did));
        setTotal((t) => Math.max(0, t - 1));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        addToast({
          type: 'error',
          title: `${action === 'approve' ? 'Approve' : 'Deny'} failed`,
          message: msg,
        });
      } finally {
        setActingDid(null);
      }
    },
    [headers, addToast],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Agent Access
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Pending hermes-id agents requesting access to this project
            {total > 0 ? ` · ${total} pending` : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            setReloadNonce((n) => n + 1);
          }}
          disabled={loading}
          className="h-7 px-2 rounded-md text-[10px] font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!adminKey && (
        <div className="px-3 py-3 rounded-md border border-border bg-muted/30">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-2">
            <KeyRound className="h-3.5 w-3.5 text-primary" /> Admin key required
          </p>
          <p className="text-[10px] text-muted-foreground/60 mb-2">
            Enter the HERMES_ID_ADMIN_KEY to manage agent access. Stored in sessionStorage for this
            tab only.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={pendingKey}
              onChange={(e) => setPendingKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitKey();
              }}
              placeholder="Admin key…"
              className="flex-1 h-7 px-2 rounded-md border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={submitKey}
              disabled={!pendingKey.trim()}
              className="h-7 px-3 rounded-md text-[10px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Unlock
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading agents...
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ShieldCheck className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs">No pending agents</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            New agents requesting access will appear here
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/30">
                <th className="px-3 py-2 font-medium">Agent DID</th>
                <th className="px-3 py-2 font-medium">Display Name</th>
                <th className="px-3 py-2 font-medium">Registered</th>
                <th className="px-3 py-2 font-medium">Projects</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.did}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-2 font-mono text-[10px] break-all max-w-[160px]">
                    {agent.did}
                  </td>
                  <td className="px-3 py-2">{agent.display_name || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {fmtRegisteredAt(agent.registered_at)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {agent.projects.length > 0 ? (
                        agent.projects.map((p) => (
                          <span
                            key={p}
                            className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]"
                          >
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => act(agent.did, 'approve')}
                        disabled={actingDid === agent.did}
                        className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button
                        onClick={() => act(agent.did, 'deny')}
                        disabled={actingDid === agent.did}
                        className="px-2 py-1 rounded-md bg-red-500/15 text-red-400 text-[10px] font-medium hover:bg-red-500/25 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" /> Deny
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {actingDid && (
        <div className="flex items-center justify-center py-1 text-muted-foreground text-[10px]">
          <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Updating agent…
        </div>
      )}
    </div>
  );
}
