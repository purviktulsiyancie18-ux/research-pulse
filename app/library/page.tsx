import Link from "next/link";
import { FeedbackControls } from "@/components/FeedbackControls";
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
  updated_at: string;
  title: string;
  abs_url: string;
  authors: Author[];
  published_at: string;
  domain_name: string;
  summary: string | null;
  client_angle: string | null;
};

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const sp = await searchParams;
  const tag = typeof sp.tag === "string" ? sp.tag : "";
  const rows = await q<Row>(
    `select f.arxiv_id, f.domain_id, f.brief_id, f.verdict, f.starred, f.note, f.client_tag, f.updated_at,
            p.title, p.abs_url, p.authors, p.published_at, d.name as domain_name, pa.summary, pa.client_angle
     from feedback f
     join papers p on p.arxiv_id = f.arxiv_id
     join domains d on d.id = f.domain_id
     left join paper_analysis pa on pa.arxiv_id = f.arxiv_id and pa.domain_id = f.domain_id and pa.prompt_version = $1
     where (f.starred or f.verdict = 'client') and ($2 = '' or f.client_tag = $2)
     order by f.updated_at desc`,
    [PROMPT_VERSION, tag],
  );
  const tags = [...new Set((await q<{ client_tag: string }>("select distinct client_tag from feedback where client_tag is not null and client_tag <> ''")).map((r) => r.client_tag))];

  return (
    <div className="mx-auto max-w-[760px]">
      <h1 className="text-2xl font-bold">Library</h1>
      <p className="text-sm text-muted">Your personal collection: every paper you starred (★ bookmarked) or marked “Bring to client”, with your notes. Click a tag to filter by client.</p>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <Link href="/library" className={`rounded-full border px-2.5 py-1 ${!tag ? "border-brand bg-brand text-white" : "border-line"}`}>
            All
          </Link>
          {tags.map((t) => (
            <Link
              key={t}
              href={`/library?tag=${encodeURIComponent(t)}`}
              className={`rounded-full border px-2.5 py-1 ${tag === t ? "border-brand bg-brand text-white" : "border-line"}`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nothing here yet. Star a paper or mark it “Bring to client” in a brief.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={`${r.arxiv_id}-${r.domain_id}`} className="card p-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                <span className="font-medium text-brand">{r.domain_name}</span>
                <span>· {fmtDate(r.published_at)}</span>
                {r.starred && <span className="text-amber-600">★</span>}
                {r.verdict === "client" && <span className="rounded bg-green-700 px-1.5 text-white">CLIENT</span>}
                {r.client_tag && <span className="rounded bg-brand-soft px-1.5 text-brand">{r.client_tag}</span>}
              </div>
              <a href={r.abs_url} target="_blank" rel="noreferrer" className="mt-1 block font-semibold hover:text-brand hover:underline">
                {r.title}
              </a>
              <p className="text-xs text-muted">{authorLine(r.authors)}</p>
              {r.summary && <p className="mt-1.5 text-sm">{r.summary}</p>}
              {r.client_angle && (
                <p className="mt-1 text-sm">
                  <span className="font-semibold">Client angle:</span> {r.client_angle}
                </p>
              )}
              <FeedbackControls
                arxivId={r.arxiv_id}
                domainId={r.domain_id}
                briefId={r.brief_id}
                initial={{ verdict: r.verdict, starred: r.starred, note: r.note, clientTag: r.client_tag }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
