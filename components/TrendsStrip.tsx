import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { accentFor } from "@/lib/accents";
import { q, q1 } from "@/lib/db";
import { getDomains } from "@/lib/repo";
import { InfoTip } from "./InfoTip";

type PerDomain = Record<string, { scanned: number; surfaced: number }>;

/** "Papers scanned" meter: this brief vs the brief before it, per domain. */
export async function TrendsStrip({ briefId, paused }: { briefId: string | null; paused: boolean }) {
  let now: PerDomain = {};
  let prev: PerDomain = {};
  if (briefId) {
    const cur = await q1<{ stats: { per_domain?: PerDomain }; created_at: string }>("select stats, created_at from briefs where id = $1", [briefId]);
    if (cur) {
      now = cur.stats.per_domain ?? {};
      const before = await q<{ stats: { per_domain?: PerDomain } }>(
        "select stats from briefs where created_at < $1 order by created_at desc limit 1",
        [cur.created_at],
      );
      prev = before[0]?.stats.per_domain ?? {};
    }
  }
  const domains = (await getDomains({ includeArchived: true })).filter((d) => d.id in now);
  const max = Math.max(1, ...domains.map((d) => Math.max(now[d.id]?.scanned ?? 0, prev[d.id]?.scanned ?? 0)));

  return (
    <div className="card-side" data-noprint>
      <p className="eyebrow flex items-center justify-between text-muted-text">
        Papers scanned
        <InfoTip text="Coloured bar = papers scanned in this brief. Grey tick = the brief before. (+/−) = change. ✓ = papers included." align="right" />
      </p>
      {domains.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-3">
          {domains.map((d) => {
            const a = accentFor(d.id);
            const n = now[d.id]?.scanned ?? 0;
            const p = prev[d.id]?.scanned;
            const delta = p === undefined ? null : n - p;
            return (
              <li key={d.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[13px] font-semibold text-heading">{d.name}</span>
                  <span className="shrink-0 text-[12px] whitespace-nowrap text-muted-text font-tabular">
                    <span className="font-semibold text-heading">{n}</span>
                    {delta !== null && (
                      <span className={delta > 0 ? "text-success-ink" : delta < 0 ? "text-error-ink" : ""}>
                        {" "}
                        ({delta > 0 ? "+" : ""}
                        {delta})
                      </span>
                    )}{" "}
                    {now[d.id]?.surfaced ?? 0}✓
                  </span>
                </div>
                <div className="relative mt-1.5 h-1.5 rounded-full bg-divider">
                  <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: a.fill }} />
                  {p !== undefined && (
                    <span className="absolute -top-[3px] h-3 w-0.5 rounded bg-muted" style={{ left: `calc(${(p / max) * 100}% - 1px)` }} aria-hidden />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-muted-text">Appears after your first brief.</p>
      )}
      <div className="mt-4 border-t border-divider pt-3 text-[12px] leading-[18px] text-muted-text">
        {paused && <span className="pill mb-2 bg-amber/14 text-amber-ink">Delivery is paused</span>}
        <p>Emailed automatically every Monday, 5:30–6:29 AM IST (India Standard Time).</p>
        <Link href="/scoring" className="mt-1 inline-flex items-center gap-1 font-display font-semibold text-primary hover:text-primary-hover">
          How papers are scored <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
