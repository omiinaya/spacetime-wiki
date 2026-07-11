import { useState, useEffect } from 'react';
import { X, Shield, User, Users, Plus, Trash2, Loader2 } from 'lucide-react';
import { api, PagePermission, User as UserType, Group } from '../lib/api';
import { timeAgo } from '../lib/utils';

interface Props {
  pageId: string;
  userId: string | null;
  onClose: () => void;
}

export function PagePermissions({ pageId, userId, onClose }: Props) {
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedRole, setSelectedRole] = useState('viewer');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [pageId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [perms, users, groups] = await Promise.all([
        api.pagePermissions.list(pageId),
        api.users.list(),
        api.groups.list(),
      ]);
      setPermissions(perms);
      setAllUsers(users);
      setAllGroups(groups);
    } catch (e) {
      console.error('Failed to load page permissions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUserPermission = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await api.pagePermissions.set(pageId, selectedUserId, '', selectedRole);
      setSelectedUserId('');
      setAddingUser(false);
      await loadData();
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleAddGroupPermission = async () => {
    if (!selectedGroupId) return;
    setSaving(true);
    try {
      await api.pagePermissions.set(pageId, '', selectedGroupId, selectedRole);
      setSelectedGroupId('');
      setAddingGroup(false);
      await loadData();
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePermission = async (permId: string) => {
    if (!confirm('Remove this permission?')) return;
    try {
      await api.pagePermissions.remove(permId);
      setPermissions((prev) => prev.filter((p) => p.id !== permId));
    } catch (e) {
      alert(String(e));
    }
  };

  const getUserName = (uid: string) => {
    const u = allUsers.find((u) => u.id === uid);
    return u ? `${u.name} (${u.email})` : uid;
  };

  const getGroupName = (gid: string) => {
    const g = allGroups.find((g) => g.id === gid);
    return g ? g.name : gid;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Page Permissions
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="Close permissions"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading...
          </div>
        ) : (
          <>
            {/* Existing permissions list */}
            <div className="space-y-1 mb-4">
              {permissions.length === 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No custom permissions set. Page inherits collection-level permissions.
                </div>
              )}
              {permissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors"
                >
                  {perm.user_id ? (
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs truncate flex-1">
                    {perm.user_id ? getUserName(perm.user_id) : getGroupName(perm.group_id)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {perm.role}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {timeAgo(perm.created_at)}
                  </span>
                  <button
                    onClick={() => handleRemovePermission(perm.id)}
                    className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0"
                    title="Remove permission"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add user permission */}
            {addingUser ? (
              <div className="p-3 rounded-md border border-border bg-muted/20 space-y-2 mb-2">
                <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">
                  Add user permission
                </p>
                <div className="flex gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    aria-label="Select user"
                    className="flex-1 h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Select user...</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    aria-label="Select role"
                    className="h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleAddUserPermission}
                    disabled={!selectedUserId || saving}
                    className="h-8 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setAddingUser(false);
                      setSelectedUserId('');
                    }}
                    className="h-8 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingUser(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mb-1"
              >
                <Plus className="h-3 w-3" /> Add user permission
              </button>
            )}

            {/* Add group permission */}
            {addingGroup ? (
              <div className="p-3 rounded-md border border-border bg-muted/20 space-y-2 mb-2">
                <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">
                  Add group permission
                </p>
                <div className="flex gap-2">
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    aria-label="Select group"
                    className="flex-1 h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Select group...</option>
                    {allGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    aria-label="Select role"
                    className="h-8 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleAddGroupPermission}
                    disabled={!selectedGroupId || saving}
                    className="h-8 px-3 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setAddingGroup(false);
                      setSelectedGroupId('');
                    }}
                    className="h-8 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingGroup(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add group permission
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
