import { ChevronRight, Mail, Search } from "lucide-react";
import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";
import { PageHeader, StatusBadge, VerdictBadge } from "@/components/ui";
import { accentFor } from "@/lib/accents";
import { PROMPT_VERSION } from "@/lib/analysis";
import { fmtDate } from "@/lib/brief";
import { q } from "@/lib/db";
import { getDomains } from "@/lib/repo";

export const dynamic = "force-dynamic";

type BriefRow = {
  id: string;
  status: string;
  window_start: string;
  window_end: string;
  emailed_at: string | null;
  stats: { scanned?: number; surfaced?: number };
};

type MatchRow = {
  brief_id: string;
  window_end: string;
  arxiv_id: string;
  title: string;
  abs_url: string;
  domain_id: number;
  domain_name: string;
  verdict: string | null;
  summary: string | null;
  note: string | null;
  final_score: string;
};

export default async function PastBriefsPage({ searchParams }: PageProps<"/briefs">) {
  const sp = await searchParams;
  const term = typeof sp.q === "string" ? sp.q.trim() : "";
  const domain = typeof sp.domain === "string" ? sp.domain : "";
  const verdict = typeof sp.verdict === "string" ? sp.verdict : "";
  const filtering = Boolean(term || domain || verdict);

  const [domains, briefs] = await Promise.all([
    getDomains({ includeArchived: true }),
    q<BriefRow>("select id, status, window_start, window_end, emailed_at, stats from briefs order by created_at desc limit 100"),
  ]);

  let matches: MatchRow[] = [];
  if (filtering) {
    matches = await q<MatchRow>(
      `select bi.brief_id, b.window_end, p.arxiv_id, p.title, p.abs_url, bi.domain_id, d.name as domain_name, pa.verdict, pa.summary, f.note, bi.final_score
       from brief_items bi
       join briefs b on b.id = bi.brief_id
       join papers p on p.arxiv_id = bi.arxiv_id
       join domains d on d.id = bi.domain_id
       left join paper_analysis pa on pa.arxiv_id = bi.arxiv_id and pa.domain_id = bi.domain_id and pa.prompt_version = $4
       left join feedback f on f.arxiv_id = bi.arxiv_id and f.domain_id = bi.domain_id
       where not bi.closest_miss
         and ($1 = '' or p.title ilike '%' || $1 || '%' or pa.summary ilike '%' || $1 || '%' or f.note ilike '%' || $1 || '%' or p.abstract ilike '%' || $1 || '%')
         and ($2 = '' or bi.domain_id::text = $2)
         and ($3 = '' or pa.verdict = $3)
       order by b.created_at desc, bi.final_score desc limit 100`,
      [term, domain, verdict, PROMPT_VERSION],
    );
  }

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-6">
      <PageHeader
        title="Past briefs"
        tip={<InfoTip text="PREVIEW = not sent yet. DELIVERED = sent; its papers won't appear again." align="left" />}
        description="Every brief ever made. Search across titles, summaries and your notes."
      >
        <form className="mt-5 flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-[2_1_260px]">
            <span className="sr-only">Search</span>
            <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-text" />
            <input name="q" defaultValue={term} placeholder="Search title, summary, notes…" className="input pl-10" />
          </label>
          <select name="domain" defaultValue={domain} className="input flex-[1_1_160px]" aria-label="Topic">
            <option value="">All topics</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select name="verdict" defaultValue={verdict} className="input flex-[1_1_160px]" aria-label="AI suggestion">
            <option value="">Any AI suggestion</option>
            <option value="READ">Suggested: Read in full</option>
            <option value="CLIENT">Suggested: Share with client</option>
            <option value="FYI">Suggested: FYI</option>
          </select>
          <button className="btn btn-primary">Search</button>
          {filtering && (
            <Link href="/briefs" className="btn btn-ghost">
              Clear
            </Link>
          )}
        </form>
      </PageHeader>

      {filtering ? (
        matches.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint text-primary">
              <Search size={22} />
            </span>
            <p className="h3 mt-3">0 matching papers</p>
            <p className="mt-1 text-[14px] text-muted-text">Try fewer words, or clear the topic and suggestion filters.</p>
          </div>
        ) : (
          <>
            <p className="eyebrow text-muted-text">
              {matches.length} matching paper{matches.length === 1 ? "" : "s"}
            </p>
            {matches.map((m) => {
              const a = accentFor(m.domain_id);
              return (
                <article key={`${m.brief_id}-${m.arxiv_id}`} className="card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pill" style={{ background: a.tint, color: a.ink }}>
                      {m.domain_name}
                    </span>
                    <VerdictBadge verdict={m.verdict} />
                    <span className="font-display text-[14px] font-extrabold text-heading font-tabular">
                      {Number(m.final_score).toFixed(1)}
                      <span className="text-[12px] font-semibold text-muted-text">/10</span>
                    </span>
                    <Link href={`/briefs/${m.brief_id}`} className="ml-auto text-[13px] font-semibold text-primary hover:text-primary-hover">
                      Week of {fmtDate(m.window_end)} →
                    </Link>
                  </div>
                  <a href={m.abs_url} target="_blank" rel="noreferrer" className="mt-2 block font-display text-[17px] leading-6 font-bold text-heading hover:text-primary-hover">
                    {m.title}
                  </a>
                  {m.summary && <p className="mt-1.5 text-[15px] leading-6 text-body">{m.summary}</p>}
                  {m.note && (
                    <div className="panel mt-3 px-4 py-3 text-[14px]">
                      <span className="font-semibold text-heading">Your note:</span> {m.note}
                    </div>
                  )}
                </article>
              );
            })}
          </>
        )
      ) : briefs.length === 0 ? (
        <div className="card text-center text-[15px] text-muted-text">No briefs yet — click Refresh on the Brief page to generate your first one.</div>
      ) : (
        <div className="card flex flex-col gap-1 p-3!">
          {briefs.map((b) => (
            <Link
              key={b.id}
              href={`/briefs/${b.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-panel px-4 py-3.5 transition-colors hover:bg-panel"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[16px] font-bold text-heading">Week of {fmtDate(b.window_end)}</span>
                <span className="block text-[12px] text-muted-text">
                  {fmtDate(b.window_start, { day: "numeric", month: "short" })} – {fmtDate(b.window_end, { day: "numeric", month: "short" })} ·{" "}
                  {b.stats?.scanned ?? 0} scanned · {b.stats?.surfaced ?? 0} included
                </span>
              </span>
              <span className="flex items-center gap-3">
                {b.emailed_at && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-muted-text">
                    <Mail size={13} /> emailed
                  </span>
                )}
                <StatusBadge status={b.status} />
                <ChevronRight size={18} className="text-muted" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
