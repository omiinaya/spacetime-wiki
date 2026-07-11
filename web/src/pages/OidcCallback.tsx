import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { callReducerLocal } from "../lib/helpers";
import { Loader2 } from "lucide-react";

export default function OidcCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    if (error || !code) { setStatus(`Authentication failed: ${error || "No authorization code"}`); return; }

    const code_verifier = localStorage.getItem("sw_oauth_verifier") || "";
    localStorage.removeItem("sw_oauth_verifier");
    const providerId = localStorage.getItem("sw_oidc_provider_id") || "";
    localStorage.removeItem("sw_oidc_provider_id");

    if (!providerId) { setStatus("No OIDC provider configured"); return; }

    (async () => {
      try {
        const provider = await api.oidc.get(providerId);
        if (!provider) { setStatus("OIDC provider not found"); return; }

        const issuer = provider.issuer_url.replace(/\/$/, "");
        const redirectUri = `${window.location.origin}/oauth/oidc/callback`;

        setStatus("Exchanging code...");

        const discRes = await fetch(`${issuer}/.well-known/openid-configuration`);
        const discovery = await discRes.json();
        const tokenUrl = discovery.token_endpoint;
        const userinfoUrl = discovery.userinfo_endpoint;

        const body = new URLSearchParams({
          client_id: provider.client_id,
          code, code_verifier,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        });
        if (provider.client_secret) {
          body.append("client_secret", provider.client_secret);
        }

        const tokenRes = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        const tokens = await tokenRes.json();
        if (tokens.error) { setStatus(`Token error: ${tokens.error_description || tokens.error}`); return; }

        let email = "";
        let name = "";

        if (tokens.id_token) {
          try {
            const payload = JSON.parse(atob(tokens.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
            email = payload.email || "";
            name = payload.name || payload.preferred_username || payload.sub || "";
          } catch {}
        }

        if (!email && userinfoUrl) {
          setStatus("Fetching profile...");
          const userRes = await fetch(userinfoUrl, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          const profile = await userRes.json();
          email = profile.email || "";
          name = profile.name || profile.preferred_username || profile.sub || "";
        }

        if (!email) { setStatus("Could not get email from provider"); return; }

        setStatus("Signing in...");
        const existing = await api.users.getByEmail(email);
        if (existing) {
          localStorage.setItem("sw_user_id", existing.id);
        } else {
          const id = "user_" + Math.random().toString(36).slice(2, 8);
          await callReducerLocal("register_user", [id, name || email.split("@")[0], email, crypto.randomUUID(), "member"]);
          localStorage.setItem("sw_user_id", id);
        }
        navigate("/", { replace: true });
      } catch (err: unknown) {
        setStatus(`Error: ${err.message || err}`);
      }
    })();
  }, [navigate]);

  return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">{status}</p></div></div>;
}
