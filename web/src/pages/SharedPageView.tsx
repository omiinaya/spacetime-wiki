import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { sqlQuery } from '../lib/api';
import { PageView } from './PageView';

// ─── Types ─────────────────────────────────────────────────���────────���───────

interface ShareLinkFromQuery {
  id: string;
  page_id: string;
  token: string;
  created_by: string;
  expires_at: number;
  created_at: number;
  visit_count: number;
  has_password: boolean;
  brand_title: string | null;
  brand_logo_url: string | null;
}

// ─── Row mapper (STDB returns positional arrays) ───────────────────────────

function mapShareLink(row: unknown[]): ShareLinkFromQuery {
  return {
    id: String(row[0] ?? ''),
    page_id: String(row[1] ?? ''),
    token: String(row[2] ?? ''),
    created_by: String(row[3] ?? ''),
    expires_at: Number(row[4]) || 0,
    created_at: Number(row[5]) || 0,
    visit_count: Number(row[6]) || 0,
    has_password: Boolean(row[7]),
    brand_title: row[8] ? String(row[8]) : null,
    brand_logo_url: row[9] ? String(row[9]) : null,
  };
}

// ─── SharedPageView ─────────────────────────────────────────────────────────

export default function SharedPageView({ userId }: { userId: string | null }) {
  const { token } = useParams<{ token: string }>();
  const [pageId, setPageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [brandTitle, setBrandTitle] = useState<string | null>(null);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing share token');
      setLoading(false);
      return;
    }
    loadShare(token);
  }, [token]);

  const loadShare = async (tok: string) => {
    try {
      setLoading(true);
      const rows = (await sqlQuery(
        `SELECT * FROM share_link WHERE token = '${tok.replace(/'/g, "''")}'`,
      )) as unknown[][];
      if (rows.length === 0) {
        setError('Share link not found');
        setLoading(false);
        return;
      }
      const link = mapShareLink(rows[0]);

      // Check expiry
      const now = Date.now();
      if (link.expires_at > 0 && now > link.expires_at) {
        setError('This share link has expired');
        setLoading(false);
        return;
      }

      // Store branding info
      setBrandTitle(link.brand_title);
      setBrandLogoUrl(link.brand_logo_url);
      if (link.brand_title) {
        document.title = link.brand_title;
      }

      // If password protected, show password prompt
      if (link.has_password) {
        setPasswordRequired(true);
        setLoading(false);
        return;
      }

      // No password — load the page directly
      // Record visit
      await fetch(
        `http://${import.meta.env.VITE_STDB_HOST || 'localhost:3001'}/v1/database/${import.meta.env.VITE_STDB_DB || 'spacetime-wiki'}/call/visit_share_link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([tok]),
        },
      ).catch((err) => console.error('Failed to record share visit:', err));

      setPageId(link.page_id);
      setLoading(false);
    } catch (err: unknown) {
      setError(String(err));
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!token || !password) return;
    try {
      const res = await fetch(
        `http://${import.meta.env.VITE_STDB_HOST || 'localhost:3001'}/v1/database/${import.meta.env.VITE_STDB_DB || 'spacetime-wiki'}/call/verify_share_password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([token, password]),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        setPasswordError(text || 'Incorrect password');
        return;
      }
      // Password correct — load page
      const rows = (await sqlQuery(
        `SELECT * FROM share_link WHERE token = '${token.replace(/'/g, "''")}'`,
      )) as unknown[][];
      if (rows.length > 0) {
        const link = mapShareLink(rows[0]);
        setPageId(link.page_id);
        setBrandTitle(link.brand_title);
        setBrandLogoUrl(link.brand_logo_url);
        if (link.brand_title) {
          document.title = link.brand_title;
        }
      } else {
        setError('Share link disappeared');
      }
      setPasswordRequired(false);
    } catch (err: unknown) {
      setPasswordError(String(err));
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  // Branding header (shown on top of error/password/page views)
  const brandingHeader =
    brandLogoUrl || brandTitle ? (
      <div className="flex items-center justify-center gap-3 py-3 px-4 border-b border-border bg-card/50">
        {brandLogoUrl && (
          <img src={brandLogoUrl} alt="Brand logo" className="h-8 w-auto object-contain" />
        )}
        {brandTitle && <span className="text-sm font-semibold text-foreground">{brandTitle}</span>}
      </div>
    ) : null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        {brandingHeader && <div className="absolute top-0 left-0 right-0">{brandingHeader}</div>}
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
        {brandingHeader && <div className="absolute top-0 left-0 right-0">{brandingHeader}</div>}
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        {brandingHeader && <div className="absolute top-0 left-0 right-0">{brandingHeader}</div>}
        <div className="max-w-md w-full p-6 rounded-xl border border-border bg-card">
          {brandLogoUrl && (
            <div className="flex justify-center mb-4">
              <img src={brandLogoUrl} alt="Brand logo" className="h-10 w-auto object-contain" />
            </div>
          )}
          <h1 className="text-lg font-semibold text-foreground mb-1 text-center">
            {brandTitle || 'Password Required'}
          </h1>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            This shared page is password-protected. Enter the password to continue.
          </p>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordSubmit();
              }}
              placeholder="Enter password"
              className="w-full h-10 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              autoFocus
            />
            {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
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
    return (
      <>
        {brandingHeader}
        <PageView pageId={pageId} userId={userId} />
      </>
    );
  }

  return null;
}
