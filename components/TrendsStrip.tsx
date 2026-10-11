import { q } from "@/lib/db";
import { getDomains } from "@/lib/repo";

type PerDomain = Record<string, { scanned: number; surfaced: number }>;

/** Papers scanned per domain in the latest brief vs the brief before it. */
export async function TrendsStrip() {
  const rows = await q<{ stats: { per_domain?: PerDomain } }>("select stats from briefs order by created_at desc limit 2");
  if (!rows.length) return null;
  const now = rows[0].stats.per_domain ?? {};
  const prev = rows[1]?.stats.per_domain ?? {};
  const domains = (await getDomains()).filter((d) => d.id in now);
  if (!domains.length) return null;
  const max = Math.max(1, ...domains.map((d) => Math.max(now[d.id]?.scanned ?? 0, prev[d.id]?.scanned ?? 0)));

  return (
    <div className="card no-print p-4">
      <h2 className="font-semibold">Trends</h2>
      <p className="text-xs text-muted">Papers scanned per domain — latest brief vs the one before</p>
      <ul className="mt-3 grid gap-2.5">
        {domains.map((d) => {
          const n = now[d.id]?.scanned ?? 0;
          const p = prev[d.id]?.scanned;
          const delta = p === undefined ? null : n - p;
          return (
            <li key={d.id} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="min-w-0 truncate">{d.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {n}
                  {delta !== null && (
                    <span className={delta > 0 ? "text-green-700" : delta < 0 ? "text-red-700" : ""}>
                      {" "}
                      ({delta > 0 ? "+" : ""}
                      {delta})
                    </span>
                  )}
                  {" · "}
                  {now[d.id]?.surfaced ?? 0}✓
                </span>
              </div>
              <div className="relative mt-1 h-2 overflow-hidden rounded bg-background">
                {p !== undefined && <div className="absolute h-2 rounded bg-line" style={{ width: `${(p / max) * 100}%` }} />}
                <div className="absolute h-2 rounded bg-brand" style={{ width: `${(n / max) * 100}%`, opacity: 0.85 }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
