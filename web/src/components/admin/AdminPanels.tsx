import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, Shield, Users, Send, CheckSquare, Download, Mail, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../Toast";
import { WebhookSettings } from "../WebhookSettings";
import { FeatureFlags } from "./FeatureFlags";
import { BulkExport } from "./BulkExport";
import { ScimSettings } from "./ScimSettings";
import { PasskeySettings } from "./PasskeySettings";
import { MfaSettings } from "./MfaSettings";
import { LdapSettings } from "./LdapSettings";
import { OAuthSettings } from "./OAuthSettings";
import { InvitationSettings } from "./InvitationSettings";
import { UsersPanel } from "./UsersPanel";
import { GroupsPanel } from "./GroupsPanel";
import { SsoPanel } from "./SsoPanel";
import { SettingsPanel } from "./SettingsPanel";

const AdminDashboard = lazy(() => import("../AdminDashboard"));
const AccessRequestPanel = lazy(() => import("../AccessRequestPanel"));

type AdminTab = "dashboard" | "users" | "groups" | "webhooks" | "sso" | "settings"
  | "features" | "export" | "scim" | "passkeys" | "invitations"
  | "access_requests" | "mfa" | "ldap" | "oauth";

interface User {
  id: string; name: string; email: string; role: string; avatar_url: string;
}

interface AdminPanelsProps {
  userId: string;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const TabFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

function TabButton({ tab, current, label, icon, setter }: {
  tab: AdminTab; current: AdminTab; label: string; icon?: React.ReactNode; setter: (t: AdminTab) => void;
}) {
  return (
    <button onClick={() => setter(tab)}
      className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
        current === tab
          ? "bg-primary/10 text-primary border-b-2 border-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon && <span className="inline mr-1">{icon}</span>}
      {label}
    </button>
  );
}

export function AdminPanels({ userId, allUsers, setAllUsers }: AdminPanelsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");

  // Fetch fresh data when the admin panel opens
  useEffect(() => {
    if (location.pathname !== "/admin") return;
    const load = async () => {
      try {
        const [users, grps, oidc, saml] = await Promise.all([
          api.users.list(),
          api.groups.list(),
          api.oidc.list(),
          api.saml.list(),
        ]);
        setAllUsers(users);
        // GroupsPanel and SsoPanel fetch their own data internally
      } catch { /* noop */ }
    };
    load();
  }, [location.pathname, setAllUsers]);

  if (location.pathname !== "/admin") return null;

  const close = () => {
    navigate("/");
  };

  const tabs: { key: AdminTab; label: string; icon?: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <Shield className="h-3 w-3" /> },
    { key: "users", label: "Users" },
    { key: "groups", label: "Groups", icon: <Users className="h-3 w-3" /> },
    { key: "webhooks", label: "Webhooks", icon: <Send className="h-3 w-3" /> },
    { key: "sso", label: "SSO", icon: <Users className="h-3 w-3" /> },
    { key: "settings", label: "Settings", icon: <Trash2 className="h-3 w-3" /> },
    { key: "features", label: "Features", icon: <CheckSquare className="h-3 w-3" /> },
    { key: "export", label: "Export", icon: <Download className="h-3 w-3" /> },
    { key: "scim", label: "SCIM", icon: <Shield className="h-3 w-3" /> },
    { key: "passkeys", label: "Passkeys" },
    { key: "invitations", label: "Invitations", icon: <Mail className="h-3 w-3" /> },
    { key: "access_requests", label: "Access Requests" },
    { key: "mfa", label: "MFA" },
    { key: "oauth", label: "OAuth" },
    { key: "ldap", label: "LDAP" },
  ];

  return (
    <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={close}>
      <div className="dialog-container w-full max-w-2xl mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Admin
          </h3>
          <button onClick={close} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
          {tabs.map(t => (
            <TabButton key={t.key} tab={t.key} current={adminTab} label={t.label} icon={t.icon} setter={setAdminTab} />
          ))}
        </div>

        {/* Tab content */}
        {adminTab === "dashboard" && (
          <Suspense fallback={<TabFallback />}>
            <AdminDashboard userId={userId} />
          </Suspense>
        )}
        {adminTab === "users" && (
          <UsersPanel allUsers={allUsers} setAllUsers={setAllUsers} userId={userId} addToast={addToast} />
        )}
        {adminTab === "groups" && (
          <GroupsPanel allUsers={allUsers} userId={userId} addToast={addToast} />
        )}
        {adminTab === "webhooks" && <WebhookSettings userId={userId} />}
        {adminTab === "sso" && <SsoPanel addToast={addToast} />}
        {adminTab === "settings" && <SettingsPanel />}
        {adminTab === "features" && <FeatureFlags />}
        {adminTab === "export" && <BulkExport />}
        {adminTab === "scim" && <ScimSettings userId={userId} />}
        {adminTab === "passkeys" && <PasskeySettings userId={userId} />}
        {adminTab === "invitations" && <InvitationSettings userId={userId} />}
        {adminTab === "access_requests" && (
          <Suspense fallback={<TabFallback />}>
            <AccessRequestPanel userId={userId} />
          </Suspense>
        )}
        {adminTab === "mfa" && <MfaSettings userId={userId} />}
        {adminTab === "ldap" && <LdapSettings userId={userId} />}
        {adminTab === "oauth" && <OAuthSettings userId={userId} />}
      </div>
    </div>
  );
}
