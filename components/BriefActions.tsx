"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function BriefActions(props: { briefId: string; status: string; emailedAt: string | null; markdown: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<string>) {
    setBusy(true);
    setMsg(null);
    try {
      setMsg(await fn());
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        <button className="btn" onClick={() => window.print()}>
          Export PDF
        </button>
        <button
          className="btn"
          onClick={async () => {
            await navigator.clipboard.writeText(props.markdown);
            setMsg("Markdown copied to clipboard");
          }}
        >
          Copy Markdown
        </button>
        {!props.emailedAt && (
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              act(async () => {
                const r = await api<{ to: string; alreadySent: boolean }>(`/api/briefs/${props.briefId}/send`, { method: "POST" });
                return r.alreadySent ? "Already emailed" : `Emailed to ${r.to}`;
              })
            }
          >
            {busy ? "Sending…" : "Send email"}
          </button>
        )}
        {props.status === "preview" && (
          <button
            className="btn"
            disabled={busy}
            title="Count this brief as delivered so its papers are not repeated next week"
            onClick={() =>
              act(async () => {
                await api(`/api/briefs/${props.briefId}/deliver`, { method: "POST" });
                return "Marked as delivered";
              })
            }
          >
            Mark as delivered
          </button>
        )}
      </div>
      {props.emailedAt && (
        <span className="text-xs text-muted">
          Emailed {new Date(props.emailedAt).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
