"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { PROGRESS_LABELS } from "@/lib/glossary";

type Mode = "since_last_brief" | "last_n_days" | "custom";
interface RunState {
  status: string;
  progress: Record<string, string>;
  briefId: string | null;
  error: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  queued: "text-muted",
  fetching: "text-blue-700",
  enriching: "text-indigo-700",
  ranking: "text-purple-700",
  done: "text-green-700",
  failed: "text-red-700",
  skipped: "text-amber-700",
};

export function RefreshPanel(props: {
  domains: { id: number; name: string; active: boolean }[];
  lookbackDays: number;
  emailDefault: boolean;
  activeRunId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(props.activeRunId));
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

  // Countdown for the manual-refresh cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Poll the run every 3 s until it finishes
  useEffect(() => {
    if (!runId) return;
    const poll = async () => {
      try {
        const r = await api<RunState>(`/api/runs/${runId}`);
        setRun(r);
        if (!["queued", "running"].includes(r.status)) {
          if (timer.current) clearInterval(timer.current);
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

  async function start() {
    setError(null);
    try {
      const r = await api<{ runId: string }>("/api/runs", {
        method: "POST",
        json: {
          mode,
          ...(mode === "custom" ? { from, to } : {}),
          domainIds: selected,
          sendEmail,
        },
      });
      setRun(null);
      setRunId(r.runId);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) setCooldown(Number(e.body.retryAfter ?? 60));
      else if (e instanceof ApiError && e.status === 409 && e.body.runId) setRunId(String(e.body.runId));
      setError((e as Error).message);
    }
  }

  const running = Boolean(runId) && (!run || ["queued", "running"].includes(run.status));
  const nameOf = (id: string) => props.domains.find((d) => String(d.id) === id)?.name ?? `Domain ${id}`;

  return (
    <div className="card no-print p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Refresh now</h2>
          <p className="text-xs text-muted">Generate a brief on demand. Previews are not emailed unless you choose to.</p>
        </div>
        {!open && !running && (
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            Refresh…
          </button>
        )}
      </div>

      {open && !running && (
        <div className="mt-4 grid gap-4">
          <div>
            <span className="label">Window <span className="normal-case font-normal">(which dates to look at)</span></span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["since_last_brief", "Since last brief"],
                  ["last_n_days", `Last ${props.lookbackDays} days`],
                  ["custom", "Custom range"],
                ] as [Mode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${mode === m ? "border-brand bg-brand-soft font-medium text-brand" : "border-line"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {mode === "since_last_brief"
                ? "Papers published since the last brief that was sent — so nothing is missed."
                : mode === "last_n_days"
                  ? `Papers published in the past ${props.lookbackDays} days (change the number in Settings).`
                  : "Pick your own start and end dates (up to 31 days)."}
            </p>
            {mode === "custom" && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
                <span>to</span>
                <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
                <span className="text-xs text-muted">max 31 days</span>
              </div>
            )}
          </div>
          <div>
            <span className="label">Domains <span className="normal-case font-normal">(topics — dark = included)</span></span>
            <div className="flex flex-wrap gap-1.5">
              {props.domains.map((d) => {
                const on = selected.includes(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelected(on ? selected.filter((x) => x !== d.id) : [...selected, d.id])}
                    className={`rounded-full border px-3 py-1 text-sm ${on ? "border-brand bg-brand text-white" : "border-line text-muted"}`}
                  >
                    {d.name}
                    {!d.active && <span className="ml-1 text-[10px] opacity-75">(paused)</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Email this brief when ready <span className="text-xs text-muted">(otherwise it&apos;s a preview shown here only)</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-primary"
              disabled={!selected.length || cooldown > 0 || (mode === "custom" && (!from || !to))}
              onClick={start}
            >
              {cooldown > 0 ? `Available in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}` : "Generate brief"}
            </button>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && !running && <p className="mt-3 text-sm text-red-700">{error}</p>}

      {runId && (running || run) && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-sm">
            {running && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />}
            <span className="font-medium">{running ? "Generating brief…" : `Run ${run?.status}`}</span>
            {running && <span className="text-xs text-muted">1–3 min</span>}
          </div>
          <ul className="mt-2 grid gap-1">
            {Object.entries(run?.progress ?? {}).map(([id, st]) => (
              <li key={id} className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">{nameOf(id)}</span>
                <span className={`text-right text-xs font-medium ${STATUS_STYLE[st] ?? ""}`}>
                  {st} <span className="font-normal text-muted">({PROGRESS_LABELS[st] ?? st})</span>
                </span>
              </li>
            ))}
            {!run &&
              [0, 1].map((i) => <li key={i} className="h-8 animate-pulse rounded-md bg-background" />)}
          </ul>
          {run?.error && <p className="mt-2 text-sm text-red-700">{run.error}</p>}
        </div>
      )}
    </div>
  );
}
