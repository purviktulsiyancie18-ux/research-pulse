"use client";

import { useState } from "react";

export default function UnlockPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (!res.ok) {
      setError("Wrong passcode");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-10 max-w-sm p-6">
      <h1 className="text-lg font-bold">Enter passcode</h1>
      <p className="mt-1 text-sm text-muted">Settings, Refresh, Send and Feedback need the admin passcode. Reading briefs is public.</p>
      <input
        type="password"
        autoFocus
        className="input mt-4"
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        placeholder="Passcode"
      />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <button className="btn btn-primary mt-4 w-full">Unlock</button>
    </form>
  );
}
