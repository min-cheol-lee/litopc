"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getDevEmail, getDevUserId, setAccessToken, setDevEmail, setDevUserId } from "../../../lib/auth";

export default function InternalLoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState("/litopc");

  useEffect(() => {
    try {
      setUserId(getDevUserId() ?? "");
      setEmail(getDevEmail() ?? "");
      setToken(getAccessToken() ?? "");
      const params = new URLSearchParams(window.location.search);
      const reason = (params.get("reason") || "").trim();
      const nextUrl = (params.get("return_to") || "/litopc").trim();
      setReturnTo(nextUrl.startsWith("/") ? nextUrl : "/litopc");
      if (reason === "billing_email_required") {
        setMessage("Billing checkout requires a tester email. Save an email identity to continue.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not read the tester session from browser storage.");
    }
  }, []);

  const navigateToReturn = useCallback(() => {
    try {
      router.push(returnTo);
    } catch {
      window.location.assign(returnTo);
    }
  }, [returnTo, router]);

  const saveAndContinue = useCallback(() => {
    try {
      const uid = userId.trim();
      const nextEmail = email.trim();
      const nextToken = token.trim();
      setDevUserId(uid);
      setDevEmail(nextEmail);
      setAccessToken(nextToken);
      if ((getDevUserId() ?? "") !== uid || (getDevEmail() ?? "") !== nextEmail || (getAccessToken() ?? "") !== nextToken) {
        setMessage("Browser storage is not persisting the tester session. Check storage/privacy settings for localhost.");
        return;
      }
      setMessage("Saved. Redirecting to simulator...");
      window.setTimeout(() => navigateToReturn(), 240);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save the tester session.");
    }
  }, [email, navigateToReturn, token, userId]);

  const clearSession = useCallback(() => {
    try {
      setDevUserId("");
      setDevEmail("");
      setAccessToken("");
      setUserId("");
      setEmail("");
      setToken("");
      if (getDevUserId() || getDevEmail() || getAccessToken()) {
        setMessage("Browser storage did not clear. Check storage/privacy settings for localhost.");
        return;
      }
      setMessage("Local tester session cleared.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not clear the tester session.");
    }
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "linear-gradient(180deg, #eef3fb 0%, #f7f9fc 100%)" }}>
      <section style={{ width: "min(560px, 100%)", borderRadius: 18, border: "1px solid rgba(25,40,62,0.14)", background: "rgba(255,255,255,0.9)", boxShadow: "0 16px 40px rgba(31,46,74,0.12)", padding: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>litopc Internal Login</h1>
        <p style={{ marginTop: 8, marginBottom: 14, color: "rgba(23,35,53,0.74)", fontSize: 14 }}>
          This page is for invite-only internal testing. It stores test identity in local browser storage.
        </p>
        <p style={{ marginTop: 0, marginBottom: 14, color: "rgba(23,35,53,0.68)", fontSize: 13 }}>
          Legacy Pro tester pairs require both fields to match: <code>master / master@opc-lab</code>, <code>tester1 / tester1@opc-lab</code>.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveAndContinue();
          }}
        >
          <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>Tester User ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="tester-alice"
            style={{ width: "100%", minHeight: 38, borderRadius: 10, border: "1px solid rgba(28,45,69,0.2)", padding: "8px 10px", marginBottom: 10 }}
          />

          <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>Tester Email (required for invite-only mode)</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alice@example.com"
            style={{ width: "100%", minHeight: 38, borderRadius: 10, border: "1px solid rgba(28,45,69,0.2)", padding: "8px 10px", marginBottom: 10 }}
          />

          <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>JWT Access Token (optional)</label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste bearer token only when AUTH_REQUIRED=1"
            rows={3}
            style={{ width: "100%", borderRadius: 10, border: "1px solid rgba(28,45,69,0.2)", padding: "8px 10px", marginBottom: 12, resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" style={{ minHeight: 36, padding: "0 14px", borderRadius: 999, border: "1px solid rgba(10,132,255,0.4)", background: "linear-gradient(180deg,#e8f2ff,#d6e8ff)", color: "#0d3f75", fontWeight: 650 }}>
              Save & Open Simulator
            </button>
            <button type="button" onClick={clearSession} style={{ minHeight: 36, padding: "0 14px", borderRadius: 999, border: "1px solid rgba(39,54,78,0.2)", background: "rgba(255,255,255,0.86)", color: "#26374f", fontWeight: 620 }}>
              Clear Session
            </button>
          </div>
        </form>

        {message && <p aria-live="polite" style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "rgba(29,44,67,0.78)" }}>{message}</p>}
      </section>
    </main>
  );
}
