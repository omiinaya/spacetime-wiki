import { useState, useEffect, useCallback } from 'react';
import { api, PasskeyCredential } from '../../lib/api';
import { arrayBufferToBase64Url } from '../../lib/helpers';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export function PasskeySettings({ userId }: { userId: string | null }) {
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadCredentials = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const creds = await api.passkeys.listCredentialsForUser(userId);
      setCredentials(creds);
    } catch (e) {
      console.error('Failed to load passkey credentials:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleRegisterBegin = async () => {
    if (!regEmail.trim()) {
      setError('Email is required');
      return;
    }
    setError('');
    setStatus('Starting registration...');
    try {
      // 1. Get registration options from the API server
      const origin = window.location.origin;
      const resp = await fetch(
        `${origin}/api/v1/webauthn/register/begin?email=${encodeURIComponent(regEmail)}&display_name=${encodeURIComponent(regName)}`,
      );
      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(detail || 'Failed to get registration options');
      }
      const creationOptions = await resp.json();

      // 2. Convert to the format expected by navigator.credentials.create()
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: Uint8Array.from(
          atob(creationOptions.challenge.replace(/-/g, '+').replace(/_/g, '/')),
          (c) => c.charCodeAt(0),
        ),
        rp: creationOptions.rp,
        user: {
          id: Uint8Array.from(
            atob(creationOptions.user.id.replace(/-/g, '+').replace(/_/g, '/')),
            (c) => c.charCodeAt(0),
          ),
          name: creationOptions.user.name,
          displayName: creationOptions.user.displayName,
        },
        pubKeyCredParams: creationOptions.pubKeyCredParams,
        timeout: creationOptions.timeout,
        attestation: creationOptions.attestation || 'none',
        authenticatorSelection: creationOptions.authenticatorSelection || {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      };

      // 3. Call the browser WebAuthn API
      setStatus('Waiting for authenticator...');
      const credential = await navigator.credentials.create({ publicKey });
      if (!credential) throw new Error('User cancelled or no credential created');

      const pkCred = credential as PublicKeyCredential;
      const response = pkCred.response as AuthenticatorAttestationResponse;

      // 4. Send registration response to the API server
      setStatus('Verifying registration...');
      const registrationPayload = {
        id: pkCred.id,
        rawId: arrayBufferToBase64Url(pkCred.rawId),
        type: pkCred.type,
        response: {
          clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
          attestationObject: arrayBufferToBase64Url(response.attestationObject),
          transports: response.getTransports ? response.getTransports() : ['internal'],
        },
        user_id: userId || '',
        email: regEmail,
        device_name: deviceName || navigator.userAgent?.slice(0, 60) || 'Unknown device',
        origin: window.location.origin,
      };

      const verifyResp = await fetch(`${origin}/api/v1/webauthn/register/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationPayload),
      });

      if (!verifyResp.ok) {
        const detail = await verifyResp.text();
        throw new Error(detail || 'Registration verification failed');
      }

      setStatus('Passkey registered successfully!');
      setRegisterOpen(false);
      setRegEmail('');
      setRegName('');
      setDeviceName('');
      await loadCredentials();
      setTimeout(() => setStatus(''), 3000);
    } catch (err: unknown) {
      setError(`Registration failed: ${err.message || err}`);
      setStatus('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this passkey credential?')) return;
    try {
      await api.passkeys.delete(id);
      await loadCredentials();
    } catch (err) {
      console.error('Failed to delete passkey:', err);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Passkeys / WebAuthn Credentials
        </p>
        <button
          onClick={() => {
            setRegisterOpen(true);
            setError('');
            setStatus('');
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-3 w-3" /> Register Passkey
        </button>
      </div>

      {/* Registered credentials */}
      <div className="space-y-2 mb-4">
        {credentials.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-muted/30 transition-colors"
          >
            <svg
              className="h-4 w-4 text-muted-foreground shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{c.device_name || 'Unknown device'}</p>
              <p className="text-[10px] text-muted-foreground/60">
                Added {new Date(c.created_at).toLocaleDateString()} · Last used{' '}
                {new Date(c.last_used_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDelete(c.id)}
              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {credentials.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">
            No passkeys registered. Register one to enable passwordless sign-in.
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
        <h4 className="text-xs font-semibold mb-1">How Passkeys work</h4>
        <p className="text-[10px] text-muted-foreground/60">
          Passkeys use your device's biometric (fingerprint, face) or PIN to sign in securely — no
          password needed. They are synced across your devices via iCloud Keychain, Google Password
          Manager, or similar. To use a passkey, click "Sign in with Passkey" on the login page.
        </p>
      </div>

      {/* Registration dialog */}
      {registerOpen && (
        <div
          className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setRegisterOpen(false)}
        >
          <div
            className="dialog-container w-full max-w-md mx-4 p-5 rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-4">Register a Passkey</h3>
            <div className="space-y-3">
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Display name (optional)"
                className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              />
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Device name (e.g. MacBook Pro)"
                className="w-full h-8 px-3 rounded-md border border-border bg-[#0a0a0a] text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              />
              {status && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5 text-primary text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {status}
                </div>
              )}
              {error && (
                <div className="px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs">
                  {error}
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setRegisterOpen(false)}
                  className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegisterBegin}
                  disabled={!regEmail.trim() || !!status}
                  className="h-8 px-4 rounded-md text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Register Passkey
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
