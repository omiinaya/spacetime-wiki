import { useState, useEffect, useCallback } from 'react';
import { Loader2, Shield, Check, X, Clock, Eye, User, FileText } from 'lucide-react';
import { accessRequestApi, sqlQuery, sqlLit, type AccessRequest } from '../lib/api';
import { timeAgo } from '../lib/utils';

// ─── Access Request Management Panel (for admin dashboard) ───────────────────

export default function AccessRequestPanel({ userId }: { userId: string | null }) {
  const [requests, setRequests] = useState<
    (AccessRequest & { pageTitle?: string; requesterName?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const pending = await accessRequestApi.listPending();
      // Enrich with page titles and requester names
      const enriched = await Promise.all(
        pending.map(async (req) => {
          let pageTitle = 'Unknown page';
          let requesterName = 'Unknown user';
          try {
            const pageRows = await sqlQuery(
              `SELECT title FROM page WHERE id = ${sqlLit(req.page_id)}`,
            );
            if (pageRows.length > 0)
              pageTitle = String((pageRows as unknown[][])[0]?.[0] || 'Unknown page');
          } catch {}
          try {
            const userRows = await sqlQuery(
              `SELECT name FROM \`user\` WHERE id = ${sqlLit(req.requester_id)}`,
            );
            if (userRows.length > 0)
              requesterName = String((userRows as unknown[][])[0]?.[0] || 'Unknown user');
          } catch {}
          return { ...req, pageTitle, requesterName };
        }),
      );
      setRequests(enriched);
    } catch (e: unknown) {
      setError(e.message || 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (id: string) => {
    if (!userId) return;
    setError('');
    try {
      await accessRequestApi.approve(id, userId);
      loadRequests();
    } catch (e: unknown) {
      setError(e.message || 'Failed to approve request');
    }
  };

  const handleDeny = async (id: string) => {
    if (!userId) return;
    setError('');
    try {
      await accessRequestApi.deny(id, userId);
      loadRequests();
    } catch (e: unknown) {
      setError(e.message || 'Failed to deny request');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      approved: 'bg-green-500/10 text-green-400 border-green-500/20',
      denied: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors[status] || 'bg-gray-500/10 text-gray-400'}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">Access Requests</p>
          <p className="text-[10px] text-muted-foreground/60">
            Users requesting access to pages they don't have permission to view
          </p>
        </div>
        <button
          onClick={loadRequests}
          className="h-7 px-2 rounded-md text-[10px] font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Loader2 className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading access requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Shield className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs">No pending access requests</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Users can request access to pages they can't view
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-muted/30 transition-colors"
            >
              <Shield className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {req.requesterName || req.requester_id}
                  </span>
                  {statusBadge(req.status)}
                  <span className="text-[10px] text-muted-foreground/40">
                    <Clock className="h-3 w-3 inline mr-0.5" />
                    {timeAgo(req.created_at / 1000)} ago
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mt-0.5">
                  <FileText className="h-3 w-3 inline" />
                  <span>Page: {req.pageTitle || req.page_id}</span>
                </div>
                {req.reason && (
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5 italic">
                    "{req.reason}"
                  </p>
                )}
              </div>
              {req.status === 'pending' && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="p-1.5 rounded text-green-400 hover:bg-green-500/10 transition-colors"
                    title="Approve access"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeny(req.id)}
                    className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Deny access"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {req.status === 'approved' && (
                <span className="text-[10px] text-green-400/60 shrink-0 py-1">Approved</span>
              )}
              {req.status === 'denied' && (
                <span className="text-[10px] text-red-400/60 shrink-0 py-1">Denied</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
