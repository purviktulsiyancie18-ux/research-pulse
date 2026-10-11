import Link from "next/link";
import { RetryDomainButton } from "@/components/RetryDomainButton";
import { fmtDate } from "@/lib/brief";
import { q } from "@/lib/db";
import { getDomains } from "@/lib/repo";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  trigger: string;
  mode: string;
  window_start: string;
  window_end: string;
  status: string;
  progress: Record<string, string>;
  stats: {
    scanned?: number;
    kept?: number;
    surfaced?: number;
    gemini_calls?: number;
    arxiv_requests?: number;
    duration_ms?: number;
    s2_ok?: boolean | null;
    hf_ok?: boolean | null;
    per_domain?: Record<string, { scanned: number; surfaced: number; error?: string }>;
  };
  error: string | null;
  brief_id: string | null;
  started_at: string;
};

const STATUS: Record<string, string> = {
  succeeded: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  running: "bg-blue-100 text-blue-800",
  queued: "bg-gray-100 text-gray-700",
  skipped: "bg-gray-100 text-gray-700",
};

const MODE: Record<string, string> = { since_last_brief: "Since last brief", last_n_days: "Last N days", custom: "Custom" };

export default async function RunsPage() {
  const [runs, domains] = await Promise.all([
    q<RunRow>("select * from runs order by started_at desc limit 50"),
    getDomains(),
  ]);
  const name = (id: string) => domains.find((d) => String(d.id) === id)?.name ?? `Domain ${id} (deleted)`;

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="text-2xl font-bold">Run history</h1>
      <p className="text-sm text-muted">Every weekly and manual run, with per-domain status. Failed or skipped domains can be retried.</p>
      {runs.length === 0 && <p className="mt-6 text-sm text-muted">No runs yet.</p>}
      <ul className="mt-4 flex flex-col gap-2">
        {runs.map((r) => {
          const started = new Date(r.started_at).toLocaleString("en-GB", {
            timeZone: "Asia/Kolkata",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <li key={r.id} className="card">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${STATUS[r.status] ?? ""}`}>{r.status}</span>
                  <span className="font-medium">{started} IST</span>
                  <span className="text-muted">
                    {r.trigger === "cron" ? "Weekly (cron)" : "Manual"} · {MODE[r.mode]}
                  </span>
                  <span className="text-muted">
                    {fmtDate(r.window_start, { day: "numeric", month: "short" })} – {fmtDate(r.window_end, { day: "numeric", month: "short" })}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted">
                    {r.stats?.duration_ms ? `${Math.round(r.stats.duration_ms / 1000)}s` : "—"} · {r.stats?.scanned ?? 0} scanned ·{" "}
                    {r.stats?.surfaced ?? 0} kept · {r.stats?.gemini_calls ?? 0} Gemini calls
                  </span>
                </summary>
                <div className="border-t border-line px-4 py-3 text-sm">
                  {r.error && <p className="mb-2 text-red-700">{r.error}</p>}
                  <table className="w-full">
                    <tbody>
                      {Object.entries(r.progress ?? {}).map(([id, st]) => {
                        const pd = r.stats?.per_domain?.[id];
                        return (
                          <tr key={id} className="border-b border-line last:border-0">
                            <td className="py-1.5">{name(id)}</td>
                            <td className="py-1.5 text-xs">{st}</td>
                            <td className="py-1.5 text-right font-mono text-xs text-muted">
                              {pd ? `${pd.scanned} scanned · ${pd.surfaced} surfaced` : ""}
                              {pd?.error && <span className="ml-2 text-red-700">{pd.error}</span>}
                            </td>
                            <td className="py-1.5 text-right">
                              {(st === "failed" || st === "skipped") && r.brief_id && <RetryDomainButton runId={r.id} domainId={Number(id)} />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted">
                    arXiv requests: {r.stats?.arxiv_requests ?? 0} · Semantic Scholar: {r.stats?.s2_ok === false ? "unavailable" : r.stats?.s2_ok ? "ok" : "off"} ·
                    Hugging Face: {r.stats?.hf_ok === false ? "unavailable" : r.stats?.hf_ok ? "ok" : "off"}
                    {r.brief_id && (
                      <>
                        {" · "}
                        <Link href={`/briefs/${r.brief_id}`} className="text-brand hover:underline">
                          Open brief
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
