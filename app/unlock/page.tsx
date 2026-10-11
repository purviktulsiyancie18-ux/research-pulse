"use client";

import { Lock, TriangleAlert } from "lucide-react";
import { useState } from "react";

export default function UnlockPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/auth/passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(true);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-6 flex max-w-[420px] flex-col items-center bg-wash text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary text-white">
        <Lock size={22} />
      </span>
      <h1 className="mt-4 font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] text-heading">Enter passcode</h1>
      <p className="mt-1 text-[14px] leading-[22px] text-body">Reading is public. Settings, Refresh, Send and Feedback need the passcode.</p>
      <input
        type="password"
        autoFocus
        aria-label="Passcode"
        aria-invalid={error}
        className={`input mt-5 min-h-12 text-center tracking-[0.2em] ${error ? "border-error!" : ""}`}
        value={passcode}
        onChange={(e) => {
          setPasscode(e.target.value);
          setError(false);
        }}
        placeholder="Passcode"
      />
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-[13px] text-error-ink">
          <TriangleAlert size={14} /> Wrong passcode
        </p>
      )}
      <button className="btn btn-primary mt-5 w-full" disabled={busy || !passcode}>
        {busy ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
