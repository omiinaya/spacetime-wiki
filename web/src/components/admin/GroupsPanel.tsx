import { useState } from "react";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import { api } from "../../lib/api";

interface Group {
  id: string; name: string; description: string; created_by: string; created_at: number; updated_at: number;
}
interface GroupMember {
  id: string; group_id: string; user_id: string; role: string;
}
interface User {
  id: string; name: string; email: string; role: string; avatar_url: string;
}

interface GroupsPanelProps {
  allUsers: User[];
  userId: string;
  addToast: (t: { type: string; title: string; duration?: number }) => void;
}

export function GroupsPanel({ allUsers, userId, addToast }: GroupsPanelProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; description: string } | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("member");

  // Fetch groups on mount via the parent's refresh pattern
  // We load groups when the component mounts by calling the API directly if empty

  const loadGroups = async () => {
    try {
      const grps = await api.groups.list();
      setGroups(grps);
    } catch { /* noop */ }
  };

  // Lazy-init
  if (groups.length === 0) {
    loadGroups();
  }

  const saveGroup = async () => {
    if (!groupName.trim()) return;
    try {
      if (editingGroup) {
        await api.groups.update(editingGroup.id, groupName, groupDesc);
        setGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, name: groupName, description: groupDesc } : g));
      } else {
        const id = crypto.randomUUID();
        await api.groups.create(id, groupName, groupDesc, userId);
        setGroups(prev => [...prev, { id, name: groupName, description: groupDesc, created_by: userId, created_at: Date.now(), updated_at: Date.now() }]);
      }
      setGroupDialogOpen(false);
      setEditingGroup(null);
      setGroupName("");
      setGroupDesc("");
    } catch (e) {
      addToast({ type: "error", title: String(e), duration: 4000 });
    }
  };

  return (
    <div>
      {/* Group dialog */}
      {groupDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setGroupDialogOpen(false)}>
          <div className="w-full max-w-sm mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xs font-semibold mb-3">{editingGroup ? "Edit Group" : "New Group"}</h3>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name"
              className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <input value={groupDesc} onChange={e => setGroupDesc(e.target.value)} placeholder="Description (optional)"
              className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs mb-3 focus:outline-none focus:ring-1 focus:ring-primary/50" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setGroupDialogOpen(false)} className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={saveGroup} className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                {editingGroup ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groups & Teams</p>
        <button onClick={() => {
          setEditingGroup(null);
          setGroupName("");
          setGroupDesc("");
          setGroupDialogOpen(true);
        }} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Plus className="h-3 w-3" /> New Group
        </button>
      </div>
      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.id} className="rounded-md border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
              <button onClick={() => {
                if (expandedGroup === g.id) {
                  setExpandedGroup(null);
                } else {
                  setExpandedGroup(g.id);
                  api.groups.listMembers(g.id).then(setGroupMembers).catch(() => {});
                }
              }} className="flex-1 flex items-center gap-2 text-left">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium truncate">{g.name}</span>
                <span className="text-[10px] text-muted-foreground/60">{g.description ? `— ${g.description}` : ""}</span>
              </button>
              <button onClick={() => {
                setEditingGroup({ id: g.id, name: g.name, description: g.description });
                setGroupName(g.name);
                setGroupDesc(g.description);
                setGroupDialogOpen(true);
              }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={async () => {
                if (!confirm(`Delete group "${g.name}"?`)) return;
                await api.groups.delete(g.id);
                setGroups(prev => prev.filter(x => x.id !== g.id));
              }} className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            {expandedGroup === g.id && (
              <div className="px-3 pb-2 border-t border-border">
                <div className="space-y-1 py-2">
                  <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Members</p>
                  {groupMembers.filter(m => m.group_id === g.id).map(m => (
                    <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded text-xs">
                      <span className="flex-1 truncate text-muted-foreground">{m.user_id}</span>
                      <select value={m.role} onChange={async (e) => {
                        await api.groups.updateMemberRole(m.id, e.target.value);
                        setGroupMembers(prev => prev.map(x => x.id === m.id ? { ...x, role: e.target.value } : x));
                      }} className="h-6 pl-1 pr-5 rounded border border-border bg-[#0a0a0a] text-[10px] focus:outline-none">
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <button onClick={async () => {
                        await api.groups.removeMember(m.id);
                        setGroupMembers(prev => prev.filter(x => x.id !== m.id));
                      }} className="text-red-400 hover:text-red-300 text-[10px]">×</button>
                    </div>
                  ))}
                  {groupMembers.filter(m => m.group_id === g.id).length === 0 && (
                    <p className="text-[10px] text-muted-foreground/50 px-2">No members yet</p>
                  )}
                </div>
                <div className="flex gap-2 pt-1 border-t border-border">
                  <select value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)}
                    className="flex-1 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-none focus:ring-1 focus:ring-primary/50">
                    <option value="">Select user...</option>
                    {allUsers.filter(u => !groupMembers.some(m => m.group_id === g.id && m.user_id === u.id)).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                  <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}
                    className="h-7 pl-1 pr-5 rounded border border-border bg-[#0a0a0a] text-xs focus:outline-none">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={async () => {
                    if (!memberUserId || !expandedGroup) return;
                    await api.groups.addMember(expandedGroup, memberUserId, memberRole, userId || "anon");
                    setMemberUserId("");
                    const updated = await api.groups.listMembers(expandedGroup);
                    setGroupMembers(updated);
                  }} disabled={!memberUserId || !expandedGroup}
                    className="h-7 px-2 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {groups.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No groups yet. Create your first team group.
          </div>
        )}
      </div>
    </div>
  );
}
