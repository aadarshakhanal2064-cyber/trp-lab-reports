"use client";

import { useState } from "react";
import { signIn } from "@/lib/db";

export function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email.trim(), password);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-page"><div className="auth-box">
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div className="brandmark">TRP Lab Reports</div>
        <div className="brandsub">Tandi Ratnanagar Polyclinic · Pathology</div>
      </div>

      <form className="card" onSubmit={submit}>
        <h2>Sign in</h2>

        {error && (
          <div className="banner" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="primary" type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="muted">
        No account? An administrator creates accounts for staff. Passwords are never
        shared between people — the audit trail depends on knowing who did what.
      </p>
    </div></div>
  );
}
