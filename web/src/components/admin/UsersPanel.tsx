import { Pencil, Trash2, Key } from "lucide-react";
import { api } from "../../lib/api";
import { ApiKeySection } from "./ApiKeySettings";
import type { ToastItem } from "../Toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string;
}

interface UsersPanelProps {
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  userId: string;
  addToast: (t: Omit<ToastItem, "id">) => string;
}

export function UsersPanel({ allUsers, setAllUsers, userId, addToast }: UsersPanelProps) {
  const updateUserRole = async (targetUserId: string, newRole: string) => {
    try {
      await api.users.updateRole(targetUserId, newRole, userId);
      setAllUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
      addToast({ type: "success", title: "Role updated", duration: 2000 });
    } catch (e) {
      addToast({ type: "error", title: String(e), duration: 4000 });
    }
  };

  const updateUserAvatar = async (targetUserId: string, avatarUrl: string) => {
    try {
      await api.users.updateAvatar(targetUserId, avatarUrl, userId);
      setAllUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, avatar_url: avatarUrl } : u));
      addToast({ type: "success", title: "Avatar updated", duration: 2000 });
    } catch (e) {
      addToast({ type: "error", title: String(e), duration: 4000 });
    }
  };

  return (
    <div>
      <div className="space-y-1 mb-4">
        {allUsers.map(u => (
          <div key={u.id} className="flex flex-col gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="relative w-6 h-6 shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : null}
                <div className={`w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary ${u.avatar_url ? 'hidden' : ''}`}>
                  {(u.name || "?").charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{u.name}</p>
                <p className="text-[10px] text-muted-foreground/60 truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  defaultValue={u.avatar_url}
                  placeholder="Avatar URL"
                  id={`avatar-input-${u.id}`}
                  className="w-32 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-[10px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById(`avatar-input-${u.id}`) as HTMLInputElement;
                    const url = input?.value?.trim() ?? "";
                    updateUserAvatar(u.id, url);
                  }}
                  className="h-7 px-2 rounded-md text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="Save avatar URL"
                >
                  Save
                </button>
              </div>
              <select
                value={u.role}
                onChange={(e) => updateUserRole(u.id, e.target.value)}
                aria-label={`Role for ${u.name}`}
                className="h-7 pl-2 pr-6 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
        ))}
        {allUsers.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">No users found</div>
        )}
      </div>
      <div className="pt-4 border-t border-border">
        <h4 className="text-xs font-semibold mb-3">Google OAuth</h4>
        <div className="flex gap-2 mb-2">
          <input
            type="text" id="googleClientId"
            defaultValue={localStorage.getItem("sw_google_client_id") || ""}
            onChange={(e) => localStorage.setItem("sw_google_client_id", e.target.value)}
            placeholder="Google OAuth Client ID"
            className="flex-1 h-7 px-2 rounded-md border border-border bg-[#0a0a0a] text-xs focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
        </div>
        <p className="text-[10px] text-muted-foreground/60 mb-3">
          Create a project at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-primary hover:underline">Google Cloud Console</a>.
          Add <code className="bg-muted px-1 rounded">{window.location.origin}/oauth/google/callback</code> as an authorized redirect URI.
        </p>
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-2"><Key className="h-3.5 w-3.5" /> API Keys</h4>
        <ApiKeySection userId={userId} />
      </div>
    </div>
  );
}
