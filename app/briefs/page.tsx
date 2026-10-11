import Link from "next/link";
import { fmtDate } from "@/lib/brief";
import { q } from "@/lib/db";
import { PROMPT_VERSION } from "@/lib/analysis";
import { getDomains } from "@/lib/repo";
import { InfoTip } from "@/components/InfoTip";

export const dynamic = "force-dynamic";

type BriefRow = {
  id: string;
  status: string;
  window_start: string;
  window_end: string;
  created_at: string;
  reading_minutes: string | null;
  emailed_at: string | null;
  stats: { scanned?: number; surfaced?: number };
};

type MatchRow = {
  brief_id: string;
  window_end: string;
  arxiv_id: string;
  title: string;
  abs_url: string;
  domain_name: string;
  verdict: string | null;
  summary: string | null;
  note: string | null;
  final_score: string;
};

export default async function ArchivePage({ searchParams }: PageProps<"/briefs">) {
  const sp = await searchParams;
  const term = typeof sp.q === "string" ? sp.q.trim() : "";
  const domain = typeof sp.domain === "string" ? sp.domain : "";
  const verdict = typeof sp.verdict === "string" ? sp.verdict : "";
  const filtering = Boolean(term || domain || verdict);

  const [domains, briefs] = await Promise.all([
    getDomains(),
    q<BriefRow>(
      "select id, status, window_start, window_end, created_at, reading_minutes, emailed_at, stats from briefs order by created_at desc limit 100",
    ),
  ]);

  let matches: MatchRow[] = [];
  if (filtering) {
    matches = await q<MatchRow>(
      `select bi.brief_id, b.window_end, p.arxiv_id, p.title, p.abs_url, d.name as domain_name, pa.verdict, pa.summary, f.note, bi.final_score
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
    <div className="mx-auto max-w-[860px]">
      <h1 className="text-2xl font-bold">Archive</h1>
      <p className="text-sm text-muted">
        Every brief ever made. Search across titles, summaries and your notes.
        <InfoTip text="PREVIEW = not sent yet. DELIVERED = sent; its papers won’t appear again." align="left" />
      </p>

      <form className="card mt-4 grid gap-2 p-3 sm:grid-cols-[1fr_200px_140px_auto]">
        <input name="q" defaultValue={term} placeholder="Search title, summary, notes…" className="input" />
        <select name="domain" defaultValue={domain} className="input">
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="verdict" defaultValue={verdict} className="input">
          <option value="">Any verdict</option>
          <option value="READ">READ · read in full</option>
          <option value="CLIENT">CLIENT · bring to client</option>
          <option value="FYI">FYI · for your information</option>
        </select>
        <div className="flex gap-1.5">
          <button className="btn btn-primary">Search</button>
          {filtering && (
            <Link href="/briefs" className="btn">
              Clear
            </Link>
          )}
        </div>
      </form>

      {filtering ? (
        <div className="mt-4">
          <p className="text-sm text-muted">{matches.length} matching paper{matches.length === 1 ? "" : "s"}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {matches.map((m) => (
              <li key={`${m.brief_id}-${m.arxiv_id}`} className="card p-3">
                <div className="text-xs text-muted">
                  {m.domain_name} · {m.verdict ?? "—"} · score {Number(m.final_score).toFixed(1)} ·{" "}
                  <Link className="text-brand hover:underline" href={`/briefs/${m.brief_id}`}>
                    Week of {fmtDate(m.window_end)}
                  </Link>
                </div>
                <a href={m.abs_url} target="_blank" rel="noreferrer" className="font-medium hover:text-brand hover:underline">
                  {m.title}
                </a>
                {m.summary && <p className="mt-1 text-sm text-[#38443d]">{m.summary}</p>}
                {m.note && <p className="mt-1 text-sm italic text-muted">Note: {m.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      ) : briefs.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No briefs yet — click Refresh on the home page to generate your first brief.</p>
      ) : (
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Week of</th>
                <th className="px-3 py-2">Window</th>
                <th className="px-3 py-2 text-right">Scanned</th>
                <th className="px-3 py-2 text-right">Included</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0 hover:bg-background">
                  <td className="px-3 py-2">
                    <Link href={`/briefs/${b.id}`} className="font-medium text-brand hover:underline">
                      {fmtDate(b.window_end)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {fmtDate(b.window_start, { day: "numeric", month: "short" })} – {fmtDate(b.window_end, { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{b.stats?.scanned ?? 0}</td>
                  <td className="px-3 py-2 text-right font-mono">{b.stats?.surfaced ?? 0}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${b.status === "delivered" ? "bg-brand text-white" : "bg-amber-100 text-amber-800"}`}>
                      {b.status.toUpperCase()}
                    </span>
                    {b.emailed_at && <span className="ml-1.5 text-xs text-muted">emailed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
