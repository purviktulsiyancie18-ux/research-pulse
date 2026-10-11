"use client";

import { Bookmark, Check, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

type Verdict = "useful" | "not_useful" | null;

const BTN = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-control border-[1.5px] px-2 text-center font-display text-[13px] leading-4 font-semibold transition duration-150";
const OFF = "border-line-strong bg-surface text-body hover:border-primary/50 hover:text-heading";

/** Filled round tick shown in place of the icon when a button is selected. */
function Tick() {
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-current">
      <Check size={11} strokeWidth={3} className="text-white" />
    </span>
  );
}

/**
 * Feedback on a paper: Useful / Not useful (one at a time) and Bookmark.
 * Bookmarked papers go to the Bookmarks tab, count as Useful for ranking, and can carry a note + client tag.
 */
export function FeedbackControls(props: {
  arxivId: string;
  domainId: number;
  briefId: string | null;
  initial: { verdict: string | null; starred: boolean; note: string | null; clientTag: string | null };
  /** "bookmarks": note panel always open. */
  variant?: "brief" | "bookmarks";
}) {
  const onBookmarksPage = props.variant === "bookmarks";
  const [verdict, setVerdict] = useState<Verdict>((props.initial.verdict as Verdict) ?? null);
  const [bookmarked, setBookmarked] = useState(props.initial.starred);
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

  function chooseVerdict(v: Exclude<Verdict, null>) {
    const next = verdict === v ? null : v;
    setVerdict(next);
    if (next === "not_useful" && bookmarked) {
      setBookmarked(false);
      setOpen(false);
    }
    save({ verdict: next });
  }

  function toggleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    if (next && verdict === "not_useful") setVerdict(null);
    if (!next) setOpen(false);
    save({ starred: next });
  }

  const hasNote = Boolean(note || clientTag);
  const fieldId = `${props.arxivId}-${props.domainId}`;
  const notePanel = (
    <div className="panel mt-3 grid gap-3 p-4">
      <div>
        <label className="field-label" htmlFor={`note-${fieldId}`}>
          {onBookmarksPage ? "Your note" : "Note"}
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
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-3 gap-2">
          <button
            type="button"
            aria-pressed={verdict === "useful"}
            title="More papers like this"
            onClick={() => chooseVerdict("useful")}
            className={`${BTN} ${verdict === "useful" ? "border-primary bg-primary-tint text-primary-pressed" : OFF}`}
          >
            {verdict === "useful" ? <Tick /> : <ThumbsUp size={15} strokeWidth={2} />}
            Useful
          </button>
          <button
            type="button"
            aria-pressed={verdict === "not_useful"}
            title="Never show this paper again; fewer like it"
            onClick={() => chooseVerdict("not_useful")}
            className={`${BTN} ${verdict === "not_useful" ? "border-muted bg-[#EEF0F6] text-body" : OFF}`}
          >
            {verdict === "not_useful" ? <Tick /> : <ThumbsDown size={15} strokeWidth={2} />}
            Not useful
          </button>
          <button
            type="button"
            aria-pressed={bookmarked}
            title={bookmarked ? "Saved to Bookmarks — click to remove" : "Save to Bookmarks (also counts as Useful)"}
            onClick={toggleBookmark}
            className={`${BTN} ${bookmarked ? "border-amber/60 bg-amber/14 text-amber-ink" : OFF}`}
          >
            <Bookmark size={15} strokeWidth={2} fill={bookmarked ? "#F59E0B" : "none"} />
            {bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        </div>
        <span className="w-14 shrink-0 text-right text-[12px]" aria-live="polite">
          {status === "saving" && <span className="text-muted-text">Saving…</span>}
          {status === "saved" && <span className="font-medium text-success-ink">Saved</span>}
          {!["idle", "saving", "saved"].includes(status) && <span className="text-error-ink">{status}</span>}
        </span>
      </div>

      {onBookmarksPage ? (
        notePanel
      ) : bookmarked ? (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!open && hasNote && (
              <p className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[14px] text-body">
                {clientTag && <span className="pill bg-teal/12 text-teal-ink">{clientTag}</span>}
                {note && <span className="line-clamp-1">{note}</span>}
              </p>
            )}
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="-ml-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-icon px-2 font-display text-[13px] font-semibold text-primary hover:bg-primary/6"
            >
              {open ? <Check size={14} /> : <Pencil size={14} />}
              {open ? "Done" : hasNote ? "Edit note" : "Add note or client tag"}
            </button>
          </div>
          {open && notePanel}
        </>
      ) : null}
    </div>
  );
}
