import { useState, useEffect, useCallback } from 'react';
import { api, Invitation } from '../../lib/api';
import { Loader2, Mail, X } from 'lucide-react';

export function InvitationSettings({ userId }: { userId: string | null }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<'viewer' | 'member'>('viewer');
  const [invMessage, setInvMessage] = useState('');
  const [invExpDays, setInvExpDays] = useState(7);
  const [invPageIds, setInvPageIds] = useState('');
  const [invColIds, setInvColIds] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadInvitations = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const invs = await api.invitations.list();
      setInvitations(invs);
    } catch (e) {
      console.error('Failed to load invitations:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleCreate = async () => {
    if (!invEmail.trim() || !invEmail.includes('@')) {
      setError('A valid email is required');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const token = Array.from({ length: 32 }, () =>
        'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36)),
      ).join('');
      const id = await api.invitations.create(
        invEmail.trim(),
        userId || '',
        invRole,
        invPageIds || '[]',
        invColIds || '[]',
        token,
        invMessage,
        invExpDays,
      );
      setSuccess(`Invitation created! Share token: ${token}`);
      setInviteOpen(false);
      setInvEmail('');
      setInvMessage('');
      loadInvitations();
    } catch (e: unknown) {
      setError(e.message || 'Failed to create invitation');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!userId) return;
    try {
      await api.invitations.revoke(id, userId);
      loadInvitations();
    } catch (e: unknown) {
      setError(e.message || 'Failed to revoke invitation');
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      accepted: 'bg-green-500/10 text-green-400 border-green-500/20',
      expired: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      revoked: 'bg-red-500/10 text-red-400 border-red-500/20',
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
          <p className="text-xs font-semibold text-foreground">Invitations</p>
          <p className="text-[10px] text-muted-foreground/60">
            Invite external users with limited page/collection access
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="h-8 px-3 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1"
        >
          <Mail className="h-3 w-3" /> Invite
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs">{error}</div>
      )}
      {success && (
        <div className="px-3 py-2 rounded-md bg-green-500/10 text-green-400 text-xs break-all">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading invitations...
        </div>
      ) : invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Mail className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs">No invitations yet</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Invite external users to collaborate
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors"
            >
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{inv.email}</span>
                  {statusBadge(inv.status)}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 mt-0.5">
                  <span>Role: {inv.role}</span>
                  {inv.page_ids !== '[]' && inv.page_ids !== '' && (
                    <span>· {JSON.parse(inv.page_ids).length} page(s)</span>
                  )}
                  {inv.collection_ids !== '[]' && inv.collection_ids !== '' && (
                    <span>· {JSON.parse(inv.collection_ids).length} collection(s)</span>
                  )}
                  <span>· {inv.view_count} view(s)</span>
                  {inv.expires_at > 0 && (
                    <span>· Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
                {inv.message && (
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5 truncate">
                    &quot;{inv.message}&quot;
                  </p>
                )}
              </div>
              {inv.status === 'pending' && (
                <button
                  onClick={() => handleRevoke(inv.id)}
                  className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create invitation dialog */}
      {inviteOpen && (
        <div
          className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setInviteOpen(false)}
        >
          <div
            className="dialog-container w-full max-w-sm mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Invite User
              </h3>
              <button
                onClick={() => setInviteOpen(false)}
                aria-label="Close dialog"
                className="p-1 rounded hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">
                  Email address *
                </label>
                <input
                  type="email"
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">Role</label>
                <select
                  value={invRole}
                  onChange={(e) => setInvRole(e.target.value as 'viewer' | 'member')}
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                >
                  <option value="viewer">Viewer (read-only)</option>
                  <option value="member">Member (can edit)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">
                  Page IDs (JSON array, optional)
                </label>
                <input
                  type="text"
                  value={invPageIds}
                  onChange={(e) => setInvPageIds(e.target.value)}
                  placeholder='["page_abc","page_def"]'
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 font-mono focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">
                  Collection IDs (JSON array, optional)
                </label>
                <input
                  type="text"
                  value={invColIds}
                  onChange={(e) => setInvColIds(e.target.value)}
                  placeholder='["col_abc"]'
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 font-mono focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">
                  Personal message (optional)
                </label>
                <input
                  type="text"
                  value={invMessage}
                  onChange={(e) => setInvMessage(e.target.value)}
                  placeholder="Hey, I'd like to share this wiki with you..."
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/60 mb-1 block">
                  Expires in (days, 0 = never)
                </label>
                <input
                  type="number"
                  value={invExpDays}
                  onChange={(e) => setInvExpDays(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setInviteOpen(false)}
                  className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!invEmail.trim() || !invEmail.includes('@')}
                  className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
