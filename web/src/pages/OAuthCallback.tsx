import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    if (error || !code) { setStatus(`Authentication failed: ${error || "No authorization code"}`); return; }

    const code_verifier = localStorage.getItem("sw_oauth_verifier") || "";
    localStorage.removeItem("sw_oauth_verifier");
    const providerId = localStorage.getItem("sw_oauth_provider_id") || "";
    localStorage.removeItem("sw_oauth_provider_id");

    if (!providerId) { setStatus("No OAuth provider configured"); return; }

    (async () => {
      try {
        setStatus("Exchanging code...");
        const redirectUri = `${window.location.origin}/oauth/callback`;

        const resp = await fetch(`${window.location.origin}/api/v1/auth/oauth/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_id: providerId,
            code,
            code_verifier,
            redirect_uri: redirectUri,
          }),
        });

        if (!resp.ok) {
          const detail = await resp.text();
          throw new Error(detail || "OAuth callback failed");
        }

        const result = await resp.json();
        if (result.user) {
          localStorage.setItem("sw_user_id", result.user.id);
          localStorage.setItem("sw_user_email", result.user.email || "");
          navigate("/", { replace: true });
        } else {
          throw new Error("No user returned from authentication");
        }
      } catch (err: unknown) {
        setStatus(`Error: ${err.message || err}`);
      }
    })();
  }, [navigate]);

  return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">{status}</p></div></div>;
}
