"use client";

import { Check, Clock, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { accentFor } from "@/lib/accents";
import { api, ApiError } from "@/lib/client";
import { PROGRESS_LABELS } from "@/lib/glossary";
import { Segmented } from "./Controls";
import { InfoTip } from "./InfoTip";
import { toast } from "./Toast";

type Mode = "since_last_brief" | "last_n_days" | "custom";
interface RunState {
  status: string;
  progress: Record<string, string>;
  briefId: string | null;
  error: string | null;
}

const STATUS_PILL: Record<string, string> = {
  queued: "bg-[#EEF0F6] text-body",
  fetching: "bg-sky/12 text-sky-ink",
  enriching: "bg-pink/12 text-pink-ink",
  ranking: "bg-primary-tint text-primary-hover",
  done: "bg-success/12 text-success-ink",
  failed: "bg-error/10 text-error-ink",
  skipped: "bg-amber/14 text-amber-ink",
};

const DAY = 86_400_000;

export function RefreshPanel(props: {
  domains: { id: number; name: string; active: boolean }[];
  lookbackDays: number;
  emailDefault: boolean;
  activeRunId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("since_last_brief");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<number[]>(props.domains.filter((d) => d.active).map((d) => d.id));
  const [sendEmail, setSendEmail] = useState(props.emailDefault);
  const [runId, setRunId] = useState<string | null>(props.activeRunId);
  const [run, setRun] = useState<RunState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!runId) return;
    const poll = async () => {
      try {
        const r = await api<RunState>(`/api/runs/${runId}`);
        setRun(r);
        if (!["queued", "running"].includes(r.status)) {
          if (timer.current) clearInterval(timer.current);
          setRunId(null);
          setOpen(false);
          if (r.status === "failed") toast(r.error ?? "The run failed", "error");
          else toast(r.status === "partial" ? "Brief ready — some topics need a retry" : "Your new brief is ready");
          if (r.briefId) router.push(`/briefs/${r.briefId}`);
          else router.refresh();
        }
      } catch {
        /* keep polling */
      }
    };
    poll();
    timer.current = setInterval(poll, 3000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [runId, router]);

  const customTooLong = mode === "custom" && from && to && new Date(to).getTime() - new Date(from).getTime() > 31 * DAY;

  async function start() {
    setError(null);
    try {
      const r = await api<{ runId: string }>("/api/runs", {
        method: "POST",
        json: { mode, ...(mode === "custom" ? { from, to } : {}), domainIds: selected, sendEmail },
      });
      setRun(null);
      setRunId(r.runId);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) setCooldown(Number(e.body.retryAfter ?? 60));
      else if (e instanceof ApiError && e.status === 409 && e.body.runId) setRunId(String(e.body.runId));
      else setError((e as Error).message);
    }
  }

  const running = Boolean(runId);
  const caption = running ? "Generating…" : cooldown > 0 ? "Cooling down" : "Brief on demand";
  const entries = Object.entries(run?.progress ?? {});
  const doneCount = entries.filter(([, s]) => ["done", "failed", "skipped"].includes(s)).length;
  const pct = entries.length ? Math.max(8, (doneCount / entries.length) * 100) : 8;
  const nameOf = (id: string) => props.domains.find((d) => String(d.id) === id)?.name ?? `Domain ${id}`;
  const expanded = open || running || cooldown > 0;

  return (
    <div data-noprint className="rounded-[22px] border border-line bg-white/92 p-2 shadow-pill backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-white">
          <RefreshCw size={18} className={running ? "animate-spin" : ""} style={running ? { animationDuration: "1.6s" } : undefined} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[14px] leading-5 font-bold text-heading">Refresh now</span>
          <span className="block text-[12px] leading-4 text-muted-text">{caption}</span>
        </span>
        {!expanded && (
          <button className="btn btn-sm btn-soft" onClick={() => setOpen(true)}>
            Refresh…
          </button>
        )}
      </div>

      {open && !running && cooldown <= 0 && (
        <div className="mt-3 flex flex-col gap-4 px-2 pb-2">
          <div>
            <p className="field-label">
              Window
              <InfoTip
                text={`Since last brief = everything since the last brief that was sent, so nothing is missed. Last ${props.lookbackDays} days = the past ${props.lookbackDays} days. Custom = your own dates, up to 31 days.`}
                align="left"
              />
            </p>
            <Segmented
              size="sm"
              label="Window"
              value={mode}
              onChange={setMode}
              options={[
                { value: "since_last_brief", label: "Since last brief" },
                { value: "last_n_days", label: `Last ${props.lookbackDays} days` },
                { value: "custom", label: "Custom range" },
              ]}
            />
            {mode === "custom" && (
              <div className="mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" aria-label="From" className="input px-2.5 text-[14px]" value={from} onChange={(e) => setFrom(e.target.value)} />
                  <input type="date" aria-label="To" className="input px-2.5 text-[14px]" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                {customTooLong ? (
                  <p className="mt-1 text-[13px] text-error-ink">Custom range can be at most 31 days.</p>
                ) : (
                  <p className="helper">Up to 31 days.</p>
                )}
              </div>
            )}
          </div>
          <div>
            <p className="field-label">Domains</p>
            <div className="flex flex-wrap gap-1.5">
              {props.domains.map((d) => {
                const on = selected.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected(on ? selected.filter((x) => x !== d.id) : [...selected, d.id])}
                    className={`inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition ${
                      on ? "border-primary/40 bg-primary-tint text-primary-pressed" : "border-line-strong bg-surface text-body"
                    }`}
                  >
                    {on && <Check size={13} strokeWidth={2.5} />}
                    {d.name}
                    {!d.active && <span className="text-[11px] opacity-75">(paused)</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-heading">
            <input type="checkbox" className="h-[18px] w-[18px] accent-primary" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Email this brief when ready
          </label>
          {error && <p className="text-[13px] text-error-ink">{error}</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={!selected.length || (mode === "custom" && (!from || !to || Boolean(customTooLong)))} onClick={start}>
              Generate brief
            </button>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {cooldown > 0 && !running && (
        <div className="mt-3 flex flex-col gap-2 px-2 pb-2">
          <button className="btn btn-disabled w-full" disabled>
            <Clock size={16} /> Available in {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
          </button>
          <p className="helper text-center">Refreshes are limited to one every 10 minutes.</p>
        </div>
      )}

      {running && (
        <div className="mt-3 px-2 pb-2" role="status">
          <p className="flex items-center gap-2 text-[14px] font-medium text-heading">
            <span className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-primary/20 border-t-primary" style={{ animationDuration: "0.8s" }} />
            Generating brief… <span className="text-[12px] font-normal text-muted-text">1–3 min</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-divider">
            <div className="h-full rounded-full bg-gradient-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {entries.length === 0 && [0, 1].map((i) => <li key={i} className="skeleton h-8" />)}
            {entries.map(([id, st]) => (
              <li key={id} className="flex items-center gap-2 text-[13px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accentFor(Number(id)).fill }} />
                <span className="min-w-0 flex-1 truncate text-heading">{nameOf(id)}</span>
                <span className={`pill shrink-0 py-0.5 text-[11px] ${STATUS_PILL[st] ?? STATUS_PILL.queued}`}>{PROGRESS_LABELS[st] ?? st}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
