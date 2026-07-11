import { useState } from 'react';
import { Link2, X } from 'lucide-react';

interface ShareData {
  id: string;
  token: string;
  expires_at: number;
  visit_count: number;
  password_hash: string;
  brand_title: string | null;
  brand_logo_url: string | null;
}

interface ShareDialogProps {
  pageTitle: string;
  sharePassword: string;
  onPasswordChange: (v: string) => void;
  shareDays: number;
  onDaysChange: (v: number) => void;
  shareUrl: string;
  shareLinks: ShareData[];
  onCreateShare: () => Promise<void>;
  onDeleteShare: (id: string) => Promise<void>;
  editBrandShareId: string | null;
  onEditBrandShareId: (id: string | null) => void;
  editBrandTitle: string;
  onEditBrandTitle: (v: string) => void;
  editBrandLogoUrl: string;
  onEditBrandLogoUrl: (v: string) => void;
  onUpdateBranding: (id: string) => Promise<void>;
  onClose: () => void;
}

export function ShareDialog({
  pageTitle,
  sharePassword,
  onPasswordChange,
  shareDays,
  onDaysChange,
  shareUrl,
  shareLinks,
  onCreateShare,
  onDeleteShare,
  editBrandShareId,
  onEditBrandShareId,
  editBrandTitle,
  onEditBrandTitle,
  editBrandLogoUrl,
  onEditBrandLogoUrl,
  onUpdateBranding,
  onClose,
}: ShareDialogProps) {
  return (
    <div
      className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="dialog-container w-full max-w-sm mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Share &quot;{pageTitle}&quot;
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground/60 mb-1 block">
              Password (optional)
            </label>
            <input
              type="text"
              value={sharePassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Leave empty for public link"
              className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground/60 mb-1 block">
              Expires in days (0 = never)
            </label>
            <input
              type="number"
              value={shareDays}
              onChange={(e) => onDaysChange(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={onCreateShare}
            className="w-full h-8 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Create share link
          </button>
          {shareUrl && (
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
              <p className="text-[10px] text-muted-foreground/60 mb-1">Share URL</p>
              <input
                readOnly
                value={shareUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground font-mono"
              />
            </div>
          )}
          {shareLinks.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground/60 mb-1">Active shares</p>
              {shareLinks.map((s) => (
                <div key={s.id}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-mono truncate flex-1">
                      {s.token.slice(0, 12)}...
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {s.visit_count} views
                    </span>
                    {s.password_hash && <span className="text-[10px]">🔒</span>}
                    {s.brand_title && (
                      <span className="text-[10px] text-purple-400" title="Custom branding">
                        🎨
                      </span>
                    )}
                    <button
                      onClick={() => onEditBrandShareId(s.id)}
                      className="text-[10px] text-purple-400 hover:text-purple-300"
                      title="Customize branding"
                    >
                      🎨
                    </button>
                    <button
                      onClick={() => onDeleteShare(s.id)}
                      className="text-red-400 hover:text-red-300 text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                  {editBrandShareId === s.id && (
                    <div className="ml-4 mt-1 p-2 rounded-md bg-muted/30 border border-border space-y-1.5">
                      <input
                        type="text"
                        value={editBrandTitle}
                        onChange={(e) => onEditBrandTitle(e.target.value)}
                        placeholder="Custom page title"
                        className="w-full h-7 px-2 rounded border border-border bg-[#0a0a0a] text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                      />
                      <input
                        type="text"
                        value={editBrandLogoUrl}
                        onChange={(e) => onEditBrandLogoUrl(e.target.value)}
                        placeholder="Logo URL"
                        className="w-full h-7 px-2 rounded border border-border bg-[#0a0a0a] text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onUpdateBranding(s.id)}
                          className="flex-1 h-6 rounded text-[10px] font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                        >
                          Save branding
                        </button>
                        <button
                          onClick={() => onEditBrandShareId(null)}
                          className="h-6 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
