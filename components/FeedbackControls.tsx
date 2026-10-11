"use client";

import { BookOpen, Briefcase, Check, Pencil, Star, ThumbsDown, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

type Verdict = "read" | "client" | "not_useful" | null;

const OPTIONS: { value: Exclude<Verdict, null>; label: string; Icon: LucideIcon; hint: string; on: string }[] = [
  { value: "read", label: "Read in full", Icon: BookOpen, hint: "Show me more like this", on: "border-primary bg-primary-tint text-primary-pressed" },
  { value: "client", label: "Bring to client", Icon: Briefcase, hint: "Saved to your Library", on: "border-teal bg-teal/12 text-teal-ink" },
  { value: "not_useful", label: "Not useful", Icon: ThumbsDown, hint: "Never show this paper again", on: "border-muted bg-[#EEF0F6] text-body" },
];

export function FeedbackControls(props: {
  arxivId: string;
  domainId: number;
  briefId: string | null;
  initial: { verdict: string | null; starred: boolean; note: string | null; clientTag: string | null };
  /** "library": note panel always open and editable. */
  variant?: "brief" | "library";
}) {
  const library = props.variant === "library";
  const [verdict, setVerdict] = useState<Verdict>((props.initial.verdict as Verdict) ?? null);
  const [starred, setStarred] = useState(props.initial.starred);
  const [note, setNote] = useState(props.initial.note ?? "");
  const [clientTag, setClientTag] = useState(props.initial.clientTag ?? "");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>("idle");
  const saved = useRef({ note: props.initial.note ?? "", clientTag: props.initial.clientTag ?? "" });

  async function save(patch: Record<string, unknown>) {
    setStatus("saving");
    try {
      await api("/api/feedback", {
        method: "POST",
        json: { arxivId: props.arxivId, domainId: props.domainId, briefId: props.briefId, ...patch },
      });
      setStatus("saved");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  // Debounced autosave for note + client tag
  useEffect(() => {
    if (note === saved.current.note && clientTag === saved.current.clientTag) return;
    const t = setTimeout(() => {
      const patch: Record<string, unknown> = {};
      if (note !== saved.current.note) patch.note = note || null;
      if (clientTag !== saved.current.clientTag) patch.clientTag = clientTag || null;
      saved.current = { note, clientTag };
      save(patch);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, clientTag]);

  const hasNote = Boolean(note || clientTag);
  const fieldId = `${props.arxivId}-${props.domainId}`;
  const notePanel = (
    <div className="panel mt-3 grid gap-3 p-4">
      <div>
        <label className="field-label" htmlFor={`note-${fieldId}`}>
          {library ? "Your note" : "Note"}
        </label>
        <textarea
          id={`note-${fieldId}`}
          className="input min-h-[80px]"
          placeholder="What stood out, who to tell, follow-ups…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="max-w-[280px]">
        <label className="field-label" htmlFor={`tag-${fieldId}`}>
          Client tag
        </label>
        <input id={`tag-${fieldId}`} className="input" placeholder="e.g. Acme Bank" value={clientTag} onChange={(e) => setClientTag(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div data-noprint className="mt-5 border-t border-divider pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid flex-1 grid-cols-3 gap-2" style={{ minWidth: "min(100%, 300px)" }}>
          {OPTIONS.map((o) => {
            const on = verdict === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                title={o.hint}
                onClick={() => {
                  const next = on ? null : o.value;
                  setVerdict(next);
                  save({ verdict: next });
                }}
                className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-control border-[1.5px] px-2 text-center font-display text-[13px] leading-4 font-semibold transition duration-150 ${
                  on ? o.on : "border-line-strong bg-surface text-body hover:border-primary/50 hover:text-heading"
                }`}
              >
                {on ? (
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-current">
                    <Check size={11} strokeWidth={3} className="text-white" />
                  </span>
                ) : (
                  <o.Icon size={15} strokeWidth={2} className="shrink-0" />
                )}
                {o.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-pressed={starred}
          aria-label={starred ? "Unstar" : "Star"}
          title={starred ? "Starred — in your Library" : "Star — save to your Library"}
          onClick={() => {
            setStarred(!starred);
            save({ starred: !starred });
          }}
          className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control border-[1.5px] transition duration-150 ${
            starred ? "border-amber/50 bg-amber/14 text-amber-ink" : "border-line-strong bg-surface text-body hover:text-amber-ink"
          }`}
        >
          <Star size={18} strokeWidth={2} fill={starred ? "#F59E0B" : "none"} />
        </button>
        {!library && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border-[1.5px] border-line-strong bg-surface px-3 font-display text-[13px] font-semibold text-body hover:text-heading"
          >
            {open ? <Check size={15} /> : <Pencil size={15} />}
            {open ? "Done" : hasNote ? "Edit note" : "Add note"}
          </button>
        )}
        <span className="ml-auto min-w-14 text-right text-[12px]" aria-live="polite">
          {status === "saving" && <span className="text-muted-text">Saving…</span>}
          {status === "saved" && <span className="font-medium text-success-ink">Saved</span>}
          {!["idle", "saving", "saved"].includes(status) && <span className="text-error-ink">{status}</span>}
        </span>
      </div>

      {library || open ? (
        notePanel
      ) : hasNote ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-body">
          {clientTag && <span className="pill bg-teal/12 text-teal-ink">{clientTag}</span>}
          {note && <span className="line-clamp-2">{note}</span>}
        </p>
      ) : null}
    </div>
  );
}
