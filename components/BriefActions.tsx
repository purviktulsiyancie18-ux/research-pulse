"use client";

import { Check, Copy, FileDown, Mail, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { toast } from "./Toast";

export function BriefActions(props: { briefId: string; status: string; emailedAt: string | null; markdown: string; recipient: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmResend, setConfirmResend] = useState(false);

  async function act(key: string, fn: () => Promise<string>) {
    setBusy(key);
    try {
      toast(await fn());
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
      setConfirmResend(false);
    }
  }

  const send = (force: boolean) =>
    act("send", async () => {
      const r = await api<{ to: string; alreadySent: boolean }>(`/api/briefs/${props.briefId}/send${force ? "?force=1" : ""}`, { method: "POST" });
      return r.alreadySent ? "This brief was already emailed" : `Emailed to ${r.to}`;
    });

  return (
    <div data-noprint className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        {!props.emailedAt && (
          <button className="btn btn-primary" disabled={busy !== null} onClick={() => send(false)}>
            <Mail size={17} /> {busy === "send" ? "Sending…" : "Send email"}
          </button>
        )}
        {props.status === "preview" && (
          <button
            className="btn btn-secondary"
            disabled={busy !== null}
            title="Count this brief as sent, so its papers won't repeat next week"
            onClick={() =>
              act("deliver", async () => {
                await api(`/api/briefs/${props.briefId}/deliver`, { method: "POST" });
                return "Marked as delivered";
              })
            }
          >
            <Check size={17} /> Mark as delivered
          </button>
        )}
        {props.emailedAt && (
          <button className="btn btn-ghost" disabled={busy !== null} onClick={() => setConfirmResend(true)}>
            <RotateCw size={16} /> Resend email
          </button>
        )}
        <span className="flex-1" />
        <button className="btn btn-ghost" title="Opens the print window — choose Save as PDF" onClick={() => window.print()}>
          <FileDown size={16} /> Export PDF
        </button>
        <button
          className="btn btn-ghost"
          title="Copy the brief as formatted text for Notion, Docs, etc."
          onClick={async () => {
            await navigator.clipboard.writeText(props.markdown);
            toast("Markdown copied to clipboard");
          }}
        >
          <Copy size={16} /> Copy Markdown
        </button>
      </div>

      {confirmResend && (
        <div className="panel mt-3 flex flex-wrap items-center gap-3 px-4 py-3">
          <p className="flex-1 text-[14px] text-heading">
            Send this brief again{props.recipient ? <> to <strong>{props.recipient}</strong></> : null}?
          </p>
          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmResend(false)}>
            Cancel
          </button>
          <button className="btn btn-sm btn-secondary" disabled={busy !== null} onClick={() => send(true)}>
            {busy === "send" ? "Sending…" : "Resend"}
          </button>
        </div>
      )}
    </div>
  );
}
