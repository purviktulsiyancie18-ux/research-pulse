import { InfoTip } from "@/components/InfoTip";
import { RunsList, type RunItem } from "@/components/RunsList";
import { PageHeader } from "@/components/ui";
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

const MODE: Record<string, string> = { since_last_brief: "Since last brief", last_n_days: "Last N days", custom: "Custom dates" };
const sourceState = (v: boolean | null | undefined) => (v === false ? "unavailable" : v ? "ok" : "off");

export default async function RunsPage() {
  const [rows, domains] = await Promise.all([q<RunRow>("select * from runs order by started_at desc limit 50"), getDomains({ includeArchived: true })]);
  const name = (id: string) => domains.find((d) => String(d.id) === id)?.name ?? `Domain ${id}`;

  const runs: RunItem[] = rows.map((r) => {
    const s = r.stats ?? {};
    return {
      id: r.id,
      status: r.status,
      started: `${new Date(r.started_at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} IST`,
      trigger: r.trigger === "cron" ? "Weekly (automatic)" : "Manual",
      mode: MODE[r.mode] ?? r.mode,
      window: `${fmtDate(r.window_start, { day: "numeric", month: "short" })} – ${fmtDate(r.window_end, { day: "numeric", month: "short" })}`,
      summary: `${s.duration_ms ? `${Math.round(s.duration_ms / 1000)}s` : "—"} · ${s.scanned ?? 0} scanned · ${s.surfaced ?? 0} included · ${s.gemini_calls ?? 0} AI calls`,
      error: r.error,
      briefId: r.brief_id,
      footer: `arXiv requests: ${s.arxiv_requests ?? 0} · Author data: ${sourceState(s.s2_ok)} · Community likes: ${sourceState(s.hf_ok)}`,
      topics: Object.entries(r.progress ?? {}).map(([id, st]) => {
        const pd = s.per_domain?.[id];
        return { id: Number(id), name: name(id), status: st, detail: pd ? `${pd.scanned} scanned · ${pd.surfaced} included` : "", error: pd?.error };
      }),
    };
  });

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-6">
      <PageHeader
        title="Run history"
        tip={
          <InfoTip
            text="SUCCEEDED = everything worked · PARTIAL = some topics failed but a brief was made · FAILED = nothing worked · SKIPPED = Monday run skipped because delivery is paused."
            align="left"
          />
        }
        description="Every attempt to build a brief. Open a run to see each topic; failed topics can be retried."
      />
      <RunsList runs={runs} />
    </div>
  );
}
