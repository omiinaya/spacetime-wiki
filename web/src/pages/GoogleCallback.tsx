import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { callReducerLocal } from "../lib/helpers";
import { Loader2 } from "lucide-react";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    if (error || !code) { setStatus(`Authentication failed: ${error || "No authorization code"}`); return; }

    const code_verifier = localStorage.getItem("sw_oauth_verifier") || "";
    localStorage.removeItem("sw_oauth_verifier");

    const GOOGLE_CLIENT_ID = localStorage.getItem("sw_google_client_id") || "";

    (async () => {
      try {
        setStatus("Exchanging code...");
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            code, code_verifier,
            grant_type: "authorization_code",
            redirect_uri: `${window.location.origin}/oauth/google/callback`,
          }),
        });
        const tokens = await tokenRes.json();
        if (tokens.error) { setStatus(`Token error: ${tokens.error_description || tokens.error}`); return; }

        setStatus("Fetching profile...");
        const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = await userRes.json();
        if (!profile.email) { setStatus("Could not get email from Google"); return; }

        setStatus("Signing in...");
        const existing = await api.users.getByEmail(profile.email);
        if (existing) {
          localStorage.setItem("sw_user_id", existing.id);
        } else {
          const id = "user_" + Math.random().toString(36).slice(2, 8);
          await callReducerLocal("register_user", [id, profile.name || profile.email.split("@")[0], profile.email, crypto.randomUUID(), "member"]);
          localStorage.setItem("sw_user_id", id);
        }
        navigate("/", { replace: true });
      } catch (err: any) {
        setStatus(`Error: ${err.message || err}`);
      }
    })();
  }, [navigate]);

  return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto mb-2" /><p className="text-xs text-muted-foreground">{status}</p></div></div>;
}
