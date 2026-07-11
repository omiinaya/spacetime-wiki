import { useState, useEffect, useCallback } from "react";
import { api, MfaMethod } from "../../lib/api";
import { Loader2, Plus } from "lucide-react";

export function MfaSettings({ userId }: { userId: string | null }) {
  const [method, setMethod] = useState<MfaMethod | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [savedBackupCodes, setSavedBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadMfa = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const m = await api.mfa.getMethod(userId);
      setMethod(m);
      if (m) {
        const codes = await api.mfa.getBackupCodes(userId);
        setSavedBackupCodes(codes.filter(c => !c.is_used).map(c => c.code_hash));
      }
    } catch (e) {
      console.error("Failed to load MFA status:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadMfa(); }, [loadMfa]);

  const generateTotpSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    const arr = new Uint8Array(20);
    crypto.getRandomValues(arr);
    for (const b of arr) {
      secret += chars[b % 32];
    }
    return secret;
  };

  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const arr = new Uint8Array(4);
      crypto.getRandomValues(arr);
      const code = Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      codes.push(code.slice(0, 8));
    }
    return codes;
  };

  const startSetup = () => {
    setError("");
    setStatus("");
    const secret = generateTotpSecret();
    setTotpSecret(secret);
    // Build otpauth:// URL for QR code
    const userEmail = localStorage.getItem("sw_user_email") || "user@spacetimewiki";
    const issuer = encodeURIComponent("SpacetimeWiki");
    const encodedSecret = encodeURIComponent(secret);
    const encodedUser = encodeURIComponent(userEmail);
    const url = `otpauth://totp/${issuer}:${encodedUser}?secret=${encodedSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    setQrUrl(url);
    setBackupCodes(generateBackupCodes());
    setVerifyCode("");
    setSetupOpen(true);
  };

  const handleVerifyAndEnable = async () => {
    if (!totpSecret || !verifyCode.trim() || !userId) return;
    setError("");
    setStatus("Verifying...");
    try {
      const code = parseInt(verifyCode.trim(), 10);
      if (isNaN(code) || code < 0 || code > 999999) {
        setError("Enter a valid 6-digit code from your authenticator app");
        setStatus("");
        return;
      }
      await api.mfa.enableTotp(userId, totpSecret, backupCodes);
      setStatus("MFA enabled successfully!");
      setSetupOpen(false);
      await loadMfa();
      setTimeout(() => setStatus(""), 3000);
    } catch (err: unknown) {
      setError(`Failed to enable MFA: ${err.message || err}`);
      setStatus("");
    }
  };

  const handleDisable = async () => {
    if (!userId || !confirm("Disable MFA? Your account will lose two-factor protection.")) return;
    try {
      await api.mfa.disable(userId);
      await loadMfa();
    } catch (err) {
      console.error("Failed to disable MFA:", err);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Multi-Factor Authentication (MFA)
        </p>
        {method?.is_enabled ? (
          <button onClick={handleDisable}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
            Disable MFA
          </button>
        ) : (
          <button onClick={startSetup}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <Plus className="h-3 w-3" /> Enable MFA
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs">{error}</div>
      )}
      {status && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md bg-green-500/10 text-green-400 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" /> {status}
        </div>
      )}

      {/* Status indicator */}
      <div className="p-3 rounded-md border border-border mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${method?.is_enabled ? "bg-green-500" : "bg-muted-foreground/30"}`} />
          <span className="text-xs font-medium">
            {method?.is_enabled ? "MFA is enabled" : "MFA is not configured"}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {method?.is_enabled
            ? "You will be prompted for a TOTP code from your authenticator app when signing in."
            : "Add an extra layer of security by requiring a time-based one-time password from your authenticator app."}
        </p>
        {method?.is_enabled && (
          <div className="mt-2 text-[10px] text-muted-foreground/60">
            <span className="font-medium text-foreground/80">Method:</span> TOTP (Time-based One-Time Password) · {savedBackupCodes.length} unused backup codes
          </div>
        )}
      </div>

      {/* Setup dialog */}
      {setupOpen && (
        <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60"
             onClick={() => setSetupOpen(false)}>
          <div className="dialog-container w-full max-w-md mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">Enable MFA (TOTP)</h3>

            <div className="space-y-4">
              {/* Step 1: Scan QR code */}
              <div>
                <p className="text-xs font-medium mb-2">Step 1: Scan with authenticator app</p>
                <div className="flex justify-center mb-2">
                  <div className="bg-white p-3 rounded-lg inline-block">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`}
                      alt="TOTP QR Code"
                      className="w-44 h-44"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/60 text-center">
                  Or manually enter: <code className="bg-muted px-1 rounded text-[10px] font-mono">{totpSecret}</code>
                </p>
              </div>

              {/* Step 2: Verify with code */}
              <div>
                <p className="text-xs font-medium mb-2">Step 2: Enter the 6-digit code</p>
                <input type="text" value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full h-9 px-3 rounded-md border border-border bg-[#0a0a0a] text-sm text-foreground text-center tracking-widest font-mono focus:outline-hidden focus:ring-1 focus:ring-primary/50" />
              </div>

              {/* Step 3: Save backup codes */}
              {backupCodes.length > 0 && (
                <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Save these backup codes!</p>
                  <p className="text-[10px] text-yellow-400/70 mb-2">
                    Each code can be used once to sign in if you lose access to your authenticator app.
                    Store them somewhere safe.
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {backupCodes.map((code, i) => (
                      <code key={i} className="text-xs font-mono bg-black/20 px-2 py-1 rounded text-yellow-300">{code}</code>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs">{error}</div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setSetupOpen(false)}
                  className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={handleVerifyAndEnable} disabled={verifyCode.length !== 6}
                  className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  Verify & Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
