import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, OidcProvider, SamlProvider, LdapProvider } from '../lib/api';
import { callReducerLocal, arrayBufferToBase64Url } from '../lib/helpers';
import { Loader2 } from 'lucide-react';

export default function LoginView() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [oidcProviders, setOidcProviders] = useState<OidcProvider[]>([]);
  const [samlProviders, setSamlProviders] = useState<SamlProvider[]>([]);
  const [ldapProviders, setLdapProviders] = useState<LdapProvider[]>([]);
  const [ldapUsername, setLdapUsername] = useState('');
  const [ldapPassword, setLdapPassword] = useState('');
  const [ldapLoading, setLdapLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<unknown[]>([]);

  useEffect(() => {
    api.oidc
      .listActive()
      .then(setOidcProviders)
      .catch(() => {});
    api.saml
      .listActive()
      .then(setSamlProviders)
      .catch(() => {});
    api.ldap
      .listActive()
      .then(setLdapProviders)
      .catch(() => {});
    api.oauth
      .listProviders()
      .then(setOauthProviders)
      .catch(() => {});
  }, []);

  const handleOidcSignIn = (provider: OidcProvider) => {
    const cv = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[b % 66])
      .join('');
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(cv)).then((hash) => {
      const cc = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      localStorage.setItem('sw_oauth_verifier', cv);
      localStorage.setItem('sw_oidc_provider_id', provider.id);
      const issuer = provider.issuer_url.replace(/\/$/, '');
      fetch(`${issuer}/.well-known/openid-configuration`)
        .then((r) => r.json())
        .then((d) => {
          window.location.href = `${d.authorization_endpoint}?client_id=${provider.client_id}&redirect_uri=${encodeURIComponent(`${window.location.origin}/oauth/oidc/callback`)}&response_type=code&scope=${encodeURIComponent(provider.scopes || 'openid email profile')}&code_challenge=${cc}&code_challenge_method=S256`;
        })
        .catch(() => setError('Could not discover OIDC endpoints.'));
    });
  };

  const handleOAuthSignIn = (provider: unknown) => {
    const cv = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[b % 66])
      .join('');
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(cv)).then((hash) => {
      const cc = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      localStorage.setItem('sw_oauth_verifier', cv);
      localStorage.setItem('sw_oauth_provider_id', provider.id);
      const redirectUri = `${window.location.origin}/oauth/callback`;
      window.location.href = `${provider.authorize_url}?client_id=${provider.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(provider.scope)}&code_challenge=${cc}&code_challenge_method=S256`;
    });
  };

  const handleGoogleSignIn = () => {
    const GOOGLE_CLIENT_ID = localStorage.getItem('sw_google_client_id') || '';
    if (!GOOGLE_CLIENT_ID) {
      setError('Google OAuth not configured.');
      return;
    }
    const cv = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[b % 66])
      .join('');
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(cv)).then((hash) => {
      const cc = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      localStorage.setItem('sw_oauth_verifier', cv);
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${window.location.origin}/oauth/google/callback`)}&response_type=code&scope=openid%20email%20profile&code_challenge=${cc}&code_challenge_method=S256`;
    });
  };

  const handleSamlSignIn = (provider: unknown) => {
    const requestId = '_' + crypto.randomUUID().replace(/-/g, '');
    const acsUrl = `${window.location.origin}/auth/saml/callback`;
    const authnRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}" Version="2.0" IssueInstant="${new Date().toISOString()}"
  Destination="${provider.sso_url}"
  AssertionConsumerServiceURL="${acsUrl}">
  <saml:Issuer>spacetime-wiki</saml:Issuer>
  <samlp:NameIDPolicy Format="${provider.name_id_format}" AllowCreate="${provider.auto_register}"/>
</samlp:AuthnRequest>`;
    import('pako').then((pako) => {
      const deflated = pako.deflate(new TextEncoder().encode(authnRequest));
      const base64 = btoa(String.fromCharCode(...deflated));
      window.location.href = `${provider.sso_url}?SAMLRequest=${encodeURIComponent(base64)}&RelayState=${provider.id}`;
    });
  };

  const handleLdapSignIn = async (providerId: string) => {
    setError('');
    if (!ldapUsername.trim() || !ldapPassword.trim()) {
      setError('LDAP username and password required');
      return;
    }
    setLdapLoading(true);
    try {
      const resp = await fetch(`${window.location.origin}/api/v1/auth/ldap/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          username: ldapUsername.trim(),
          password: ldapPassword,
        }),
      });
      if (!resp.ok) throw new Error((await resp.text()) || 'LDAP auth failed');
      const result = await resp.json();
      if (result.user) {
        localStorage.setItem('sw_user_id', result.user.id);
        navigate('/');
      } else throw new Error('No user returned');
    } catch (err: unknown) {
      setError(`LDAP failed: ${err.message || err}`);
    } finally {
      setLdapLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) await api.users.register(name, email, password, 'member');
      const user = await api.users.login(email, password);
      if (!user) throw new Error('Login failed');
      const mfaEnabled = await api.mfa.isEnabled(user.id);
      if (mfaEnabled) {
        setPendingUserId(user.id);
        setMfaRequired(true);
        return;
      }
      localStorage.setItem('sw_user_id', user.id);
      navigate('/');
    } catch (err: unknown) {
      setError(String(err));
    }
  };

  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingUserId, setPendingUserId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaBackupMode, setMfaBackupMode] = useState(false);
  const [mfaBackupCode, setMfaBackupCode] = useState('');

  const handleMfaVerify = async () => {
    if (!pendingUserId) return;
    setMfaError('');
    try {
      if (mfaBackupMode) await api.mfa.verifyBackupCode(pendingUserId, mfaBackupCode);
      else {
        const code = parseInt(mfaCode, 10);
        if (isNaN(code) || code < 100000 || code > 999999) {
          setMfaError('Enter a valid 6-digit code');
          return;
        }
        await api.mfa.verifyTotp(pendingUserId, code);
      }
      localStorage.setItem('sw_user_id', pendingUserId);
      navigate('/');
    } catch (err: unknown) {
      setMfaError(err.message || 'Verification failed');
    }
  };

  const handlePasskeySignIn = async () => {
    setError('');
    try {
      const resp = await fetch(
        `${window.location.origin}/api/v1/webauthn/auth/begin?email=${encodeURIComponent(email || '')}`,
      );
      if (!resp.ok) throw new Error((await resp.text()) || 'Failed to get challenge');
      const options = await resp.json();
      const publicKey: CredentialRequestOptions['publicKey'] = {
        challenge: Uint8Array.from(
          atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')),
          (c) => c.charCodeAt(0),
        ),
        timeout: options.timeout,
        rpId: options.rpId,
        userVerification: options.userVerification,
      };
      if (options.allowCredentials?.length > 0) {
        publicKey.allowCredentials = options.allowCredentials.map((cred: unknown) => ({
          id: Uint8Array.from(atob(cred.id.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
            c.charCodeAt(0),
          ),
          type: 'public-key' as PublicKeyCredentialType,
          transports: cred.transports as AuthenticatorTransport[],
        }));
      }
      const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
      if (!credential) throw new Error('No credential returned');
      const response = credential.response as AuthenticatorAssertionResponse;
      const verifyResp = await fetch(`${window.location.origin}/api/v1/webauthn/auth/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          rawId: arrayBufferToBase64Url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
            authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
            signature: arrayBufferToBase64Url(response.signature),
            userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : '',
          },
        }),
      });
      if (!verifyResp.ok) throw new Error((await verifyResp.text()) || 'Auth failed');
      const result = await verifyResp.json();
      if (result.user) {
        localStorage.setItem('sw_user_id', result.user.id);
        navigate('/');
      } else throw new Error('No user returned');
    } catch (err: unknown) {
      setError(`Passkey sign-in failed: ${err.message || err}`);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-md mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {mfaRequired ? 'Two-Factor Authentication' : isRegister ? 'Create account' : 'Sign in'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mfaRequired
              ? 'Enter the verification code from your authenticator app.'
              : isRegister
                ? "Join your team's knowledge base."
                : 'Welcome back.'}
          </p>
        </div>

        {mfaRequired ? (
          <div className="space-y-4">
            <label className="block text-xs font-medium mb-1">
              {mfaBackupMode ? 'Backup Code' : 'Authenticator Code'}
            </label>
            {mfaBackupMode ? (
              <input
                type="text"
                value={mfaBackupCode}
                onChange={(e) => setMfaBackupCode(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="XXXX-XXXX"
                className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm text-center tracking-widest font-mono focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              />
            ) : (
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm text-center tracking-widest font-mono focus:outline-hidden focus:ring-1 focus:ring-primary/50"
              />
            )}
            {mfaError && (
              <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-md">
                {mfaError}
              </div>
            )}
            <button
              onClick={handleMfaVerify}
              disabled={mfaBackupMode ? mfaBackupCode.length < 4 : mfaCode.length !== 6}
              className="w-full h-9 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              Verify
            </button>
            <button
              onClick={() => {
                setMfaBackupMode(!mfaBackupMode);
                setMfaError('');
              }}
              className="w-full text-xs text-primary hover:underline"
            >
              {mfaBackupMode ? 'Use authenticator app instead' : 'Use a backup code instead'}
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label htmlFor="login-name" className="block text-xs font-medium mb-1">
                    Name
                  </label>
                  <input
                    id="login-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                    required
                  />
                </div>
              )}
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium mb-1">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-medium mb-1">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                  required
                />
              </div>
              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full h-9 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                {isRegister ? 'Create account' : 'Sign in'}
              </button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              {oidcProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleOidcSignIn(p)}
                  className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
                >
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Sign in with {p.name}
                </button>
              ))}
              {samlProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSamlSignIn(p)}
                  className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
                >
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M8 12h8" />
                    <path d="M8 8h8" />
                    <path d="M8 16h5" />
                  </svg>
                  Sign in with {p.name} (SAML)
                </button>
              ))}
              <button
                onClick={handleGoogleSignIn}
                className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </button>
              {oauthProviders.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleOAuthSignIn(p)}
                  className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
                >
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Sign in with {p.name}
                </button>
              ))}
              <button
                onClick={handlePasskeySignIn}
                className="w-full h-9 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted flex items-center justify-center gap-2"
              >
                <svg
                  className="h-4 w-4 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
                Sign in with Passkey
              </button>
              {ldapProviders.map((p) => (
                <div key={p.id} className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground">
                    Sign in with LDAP ({p.name})
                  </p>
                  <input
                    type="text"
                    value={ldapUsername}
                    onChange={(e) => setLdapUsername(e.target.value)}
                    placeholder="LDAP username"
                    className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                  />
                  <input
                    type="password"
                    value={ldapPassword}
                    onChange={(e) => setLdapPassword(e.target.value)}
                    placeholder="LDAP password"
                    className="w-full h-9 px-3 rounded-md border border-border bg-card text-sm focus:outline-hidden focus:ring-1 focus:ring-primary/50"
                  />
                  <button
                    onClick={() => handleLdapSignIn(p.id)}
                    disabled={ldapLoading}
                    className="w-full h-9 rounded-md border border-primary/30 bg-primary/5 text-sm font-medium hover:bg-primary/10 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {ldapLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                    Sign in with LDAP
                  </button>
                </div>
              ))}
            </form>
            <p className="text-xs text-muted-foreground text-center">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-primary hover:underline"
              >
                {isRegister ? 'Sign in' : 'Register'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
