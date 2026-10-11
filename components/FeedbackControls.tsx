"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type Verdict = "read" | "client" | "not_useful" | null;

const BUTTONS: { value: Exclude<Verdict, null>; label: string; hint: string; active: string }[] = [
  { value: "read", label: "Read in full", hint: "I'll read this — show me more like it", active: "border-blue-600 bg-blue-600 text-white" },
  { value: "client", label: "Bring to client", hint: "I'll use this with a client — saved to Library", active: "border-green-700 bg-green-700 text-white" },
  { value: "not_useful", label: "Not useful", hint: "Not relevant — never show this paper again", active: "border-gray-600 bg-gray-600 text-white" },
];

export function FeedbackControls(props: {
  arxivId: string;
  domainId: number;
  briefId: string | null;
  initial: { verdict: string | null; starred: boolean; note: string | null; clientTag: string | null };
}) {
  const [verdict, setVerdict] = useState<Verdict>((props.initial.verdict as Verdict) ?? null);
  const [starred, setStarred] = useState(props.initial.starred);
  const [note, setNote] = useState(props.initial.note ?? "");
  const [clientTag, setClientTag] = useState(props.initial.clientTag ?? "");
  const [open, setOpen] = useState(Boolean(props.initial.note || props.initial.clientTag));
  const [status, setStatus] = useState<string | null>(null);

  async function save(patch: Record<string, unknown>) {
    setStatus("Saving…");
    try {
      await api("/api/feedback", {
        method: "POST",
        json: { arxivId: props.arxivId, domainId: props.domainId, briefId: props.briefId, ...patch },
      });
      setStatus("Saved");
      setTimeout(() => setStatus(null), 1500);
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  return (
    <div className="no-print mt-3 border-t border-line pt-3">
      <p className="mb-1.5 text-[11px] text-muted">
        Your feedback (teaches the ranking): Read in full = show more like this · Bring to client = save to Library · Not useful = hide forever · Star =
        bookmark
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {BUTTONS.map((b) => (
          <button
            key={b.value}
            type="button"
            title={b.hint}
            onClick={() => {
              const next = verdict === b.value ? null : b.value;
              setVerdict(next);
              save({ verdict: next });
            }}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              verdict === b.value ? b.active : "border-line bg-surface text-muted hover:border-brand hover:text-brand"
            }`}
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          aria-label={starred ? "Unstar" : "Star"}
          onClick={() => {
            setStarred(!starred);
            save({ starred: !starred });
          }}
          className={`rounded-full border px-2 py-1 text-xs ${starred ? "border-amber-400 bg-amber-50 text-amber-600" : "border-line text-muted hover:text-amber-600"}`}
        >
          {starred ? "★ Starred" : "☆ Star"}
        </button>
        <button type="button" onClick={() => setOpen(!open)} className="px-1.5 text-xs text-muted underline-offset-2 hover:underline">
          {open ? "Hide note" : "Add note"}
        </button>
        {status && <span className="text-xs text-muted">{status}</span>}
      </div>
      {open && (
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_180px]">
          <textarea
            className="input min-h-[60px]"
            placeholder="Note for your running log…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (props.initial.note ?? "") && save({ note: note || null })}
          />
          <input
            className="input h-fit"
            placeholder="Client tag — which client (e.g. Acme Bank)"
            value={clientTag}
            onChange={(e) => setClientTag(e.target.value)}
            onBlur={() => clientTag !== (props.initial.clientTag ?? "") && save({ clientTag: clientTag || null })}
          />
        </div>
      )}
    </div>
  );
}
