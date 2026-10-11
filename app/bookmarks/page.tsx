import { Bookmark, Briefcase } from "lucide-react";
import Link from "next/link";
import { FeedbackControls } from "@/components/FeedbackControls";
import { PageHeader } from "@/components/ui";
import { accentFor } from "@/lib/accents";
import { PROMPT_VERSION } from "@/lib/analysis";
import { authorLine, fmtDate } from "@/lib/brief";
import { q } from "@/lib/db";
import type { Author } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  arxiv_id: string;
  domain_id: number;
  brief_id: string | null;
  verdict: string | null;
  starred: boolean;
  note: string | null;
  client_tag: string | null;
  title: string;
  abs_url: string;
  authors: Author[];
  published_at: string;
  domain_name: string;
  summary: string | null;
  client_angle: string | null;
};

export default async function BookmarksPage({ searchParams }: PageProps<"/bookmarks">) {
  const sp = await searchParams;
  const tag = typeof sp.tag === "string" ? sp.tag : "";
  const all = await q<Row>(
    `select f.arxiv_id, f.domain_id, f.brief_id, f.verdict, f.starred, f.note, f.client_tag,
            p.title, p.abs_url, p.authors, p.published_at, d.name as domain_name, pa.summary, pa.client_angle
     from feedback f
     join papers p on p.arxiv_id = f.arxiv_id
     join domains d on d.id = f.domain_id
     left join paper_analysis pa on pa.arxiv_id = f.arxiv_id and pa.domain_id = f.domain_id and pa.prompt_version = $1
     where f.starred
     order by f.updated_at desc`,
    [PROMPT_VERSION],
  );
  const rows = tag ? all.filter((r) => r.client_tag === tag) : all;
  const tags = new Map<string, number>();
  for (const r of all) if (r.client_tag) tags.set(r.client_tag, (tags.get(r.client_tag) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bookmarks"
        description="Papers you bookmarked, with your notes and client tags."
        wash="linear-gradient(135deg, rgba(20,184,166,0.07), #FFFFFF 50%, rgba(245,158,11,0.06))"
      >
        {tags.size > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {[["", all.length] as const, ...[...tags.entries()]].map(([t, n]) => {
              const on = tag === t;
              return (
                <Link
                  key={t || "all"}
                  href={t ? `/bookmarks?tag=${encodeURIComponent(t)}` : "/bookmarks"}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 font-display text-[13px] font-semibold transition ${
                    on ? "border-primary bg-primary text-white" : "border-line-strong bg-surface text-body hover:text-heading"
                  }`}
                >
                  {t || "All"}
                  <span className={`text-[11px] font-tabular ${on ? "text-white/80" : "text-muted-text"}`}>{n}</span>
                </Link>
              );
            })}
          </div>
        )}
      </PageHeader>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center py-14 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber/14 text-amber-ink">
            <Bookmark size={26} />
          </span>
          <p className="h2 mt-4">No bookmarks yet</p>
          <p className="mt-1 text-[15px] text-body">Tap Bookmark on any paper in a brief to save it here.</p>
          <Link href="/" className="btn btn-secondary mt-5">
            Open this week&apos;s brief
          </Link>
        </div>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 400px), 1fr))" }}>
          {rows.map((r) => {
            const a = accentFor(r.domain_id);
            return (
              <article key={`${r.arxiv_id}-${r.domain_id}`} className="card flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="pill" style={{ background: a.tint, color: a.ink }}>
                    {r.domain_name}
                  </span>
                  {r.client_tag && <span className="pill border border-teal/40 bg-surface text-teal-ink">{r.client_tag}</span>}
                  <span className="ml-auto text-[12px] text-muted-text">{fmtDate(r.published_at)}</span>
                </div>
                <a href={r.abs_url} target="_blank" rel="noreferrer" className="mt-3 block font-display text-[18px] leading-[26px] font-bold text-heading hover:text-primary-hover">
                  {r.title}
                </a>
                <p className="mt-1 text-[13px] text-muted-text">{authorLine(r.authors)}</p>
                {r.summary && <p className="mt-2 text-[15px] leading-6 text-body">{r.summary}</p>}
                {r.client_angle && (
                  <div className="mt-3 rounded-panel border border-teal/28 bg-teal/7 px-4 py-3">
                    <p className="eyebrow flex items-center gap-1.5 text-teal-ink">
                      <Briefcase size={13} strokeWidth={2.5} /> Client angle
                    </p>
                    <p className="mt-1 text-[14px] leading-[22px] font-medium text-heading">{r.client_angle}</p>
                  </div>
                )}
                <div className="mt-auto">
                  <FeedbackControls
                    variant="bookmarks"
                    arxivId={r.arxiv_id}
                    domainId={r.domain_id}
                    briefId={r.brief_id}
                    initial={{ verdict: r.verdict, starred: r.starred, note: r.note, clientTag: r.client_tag }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
