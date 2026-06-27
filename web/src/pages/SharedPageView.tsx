import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { sqlQuery } from "../lib/api";
import { PageView } from "./PageView";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ShareLinkFromQuery {
  id: string;
  page_id: string;
  token: string;
  password_hash: string;
  created_by: string;
  expires_at: number;
  created_at: number;
  visit_count: number;
}

// ─── Row mapper (STDB returns positional arrays) ───────────────────────────

function mapShareLink(row: unknown[]): ShareLinkFromQuery {
  return {
    id: String(row[0] ?? ""),
    page_id: String(row[1] ?? ""),
    token: String(row[2] ?? ""),
    password_hash: String(row[3] ?? ""),
    created_by: String(row[4] ?? ""),
    expires_at: Number(row[5]) || 0,
    created_at: Number(row[6]) || 0,
    visit_count: Number(row[7]) || 0,
  };
}

// ─── SharedPageView ─────────────────────────────────────────────────────────

export default function SharedPageView({ userId }: { userId: string | null }) {
  const { token } = useParams<{ token: string }>();
  const [pageId, setPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Missing share token");
      setLoading(false);
      return;
    }
    loadShare(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadShare = async (tok: string) => {
    try {
      setLoading(true);
      const rows = (await sqlQuery(
        `SELECT * FROM share_link WHERE token = '${tok.replace(/'/g, "''")}'`
      )) as unknown[][];
      if (rows.length === 0) {
        setError("Share link not found");
        setLoading(false);
        return;
      }
      const link = mapShareLink(rows[0]);

      // Check expiry
      const now = Date.now();
      if (link.expires_at > 0 && now > link.expires_at) {
        setError("This share link has expired");
        setLoading(false);
        return;
      }

      // If password protected, show password prompt
      if (link.password_hash && link.password_hash.length > 0) {
        setPasswordRequired(true);
        setLoading(false);
        return;
      }

      // No password — load the page directly
      // Record visit
      await fetch(
        `http://192.168.1.10:3001/v1/database/c2000df40a4560c4985121fce5ab36ba57e4d170e4fa08a5f00c85880b5102f0/call/visit_share_link`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify([tok]) }
      ).catch(() => {});

      setPageId(link.page_id);
      setLoading(false);
    } catch (err: any) {
      setError(String(err));
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!token || !password) return;
    try {
      const res = await fetch(
        `http://192.168.1.10:3001/v1/database/c2000df40a4560c4985121fce5ab36ba57e4d170e4fa08a5f00c85880b5102f0/call/verify_share_password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([token, password]),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        setPasswordError(text || "Incorrect password");
        return;
      }
      // Password correct — load page
      const rows = (await sqlQuery(
        `SELECT * FROM share_link WHERE token = '${token.replace(/'/g, "''")}'`
      )) as unknown[][];
      if (rows.length > 0) {
        const link = mapShareLink(rows[0]);
        setPageId(link.page_id);
      } else {
        setError("Share link disappeared");
      }
      setPasswordRequired(false);
    } catch (err: any) {
      setPasswordError(String(err));
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="max-w-md w-full p-6 rounded-xl border border-border bg-card text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Access Error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="max-w-md w-full p-6 rounded-xl border border-border bg-card">
          <div className="text-4xl mb-3 text-center">🔒</div>
          <h1 className="text-lg font-semibold text-foreground mb-1 text-center">Password Required</h1>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            This shared page is password-protected. Enter the password to continue.
          </p>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(); }}
              placeholder="Enter password"
              className="w-full h-10 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-red-400">{passwordError}</p>
            )}
            <button
              onClick={handlePasswordSubmit}
              disabled={!password}
              className="w-full h-10 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pageId) {
    return <PageView pageId={pageId} userId={userId} />;
  }

  return null;
}
