import { q, q1 } from "./db";
import { PROMPT_VERSION } from "./analysis";
import { getDomains } from "./repo";
import type { Author, Domain, S2Info, ScoreBreakdown, Verdict } from "./types";

type Row = Record<string, unknown>;

export interface Card {
  arxivId: string;
  domainId: number;
  title: string;
  authors: Author[];
  affiliations: string[];
  publishedAt: string;
  absUrl: string;
  pdfUrl: string | null;
  codeUrl: string | null;
  score: number;
  verdict: Verdict | null;
  summary: string;
  keyFinding: string | null;
  whyItMatters: string | null;
  clientAngle: string | null;
  method: string | null;
  limitations: string | null;
  chips: string[];
  breakdown: ScoreBreakdown;
  aiAvailable: boolean;
  closestMiss: boolean;
  alsoRelevantTo: string[];
  feedback: { verdict: string | null; starred: boolean; note: string | null; clientTag: string | null };
}

export interface BriefSection {
  domain: Pick<Domain, "id" | "name" | "priority">;
  headline: string | null;
  cards: Card[];
  closestMiss: Card | null;
  notice: string | null;
}

export interface BriefView {
  id: string;
  status: "preview" | "delivered";
  windowStart: string;
  windowEnd: string;
  headline: string | null;
  notices: string[];
  stats: { scanned?: number; domains?: number; surfaced?: number; ai_ok?: boolean; per_domain?: Record<string, { scanned: number; surfaced: number }> };
  readingMinutes: number | null;
  emailedAt: string | null;
  createdAt: string;
  runId: string | null;
  sections: BriefSection[];
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ""));

export function fallbackSummaryText(abstract: string, s2: S2Info | null) {
  if (s2?.tldr) return s2.tldr;
  return abstract.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
}

export async function getBriefView(id: string): Promise<BriefView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const b = await q1<Row>("select * from briefs where id = $1", [id]);
  if (!b) return null;
  const domains = await getDomains();
  const byId = new Map(domains.map((d) => [d.id, d]));
  const rows = await q<Row>(
    `select bi.domain_id, bi.arxiv_id, bi.rank, bi.final_score, bi.score_breakdown, bi.also_relevant_to, bi.ai_available, bi.closest_miss,
            p.title, p.abstract, p.authors, p.published_at, p.abs_url, p.pdf_url, p.code_url, p.s2,
            pa.summary, pa.key_finding, pa.why_it_matters, pa.client_angle, pa.method, pa.limitations, pa.verdict,
            f.verdict as fb_verdict, coalesce(f.starred, false) as fb_starred, f.note as fb_note, f.client_tag as fb_client_tag
     from brief_items bi
     join papers p on p.arxiv_id = bi.arxiv_id
     left join paper_analysis pa on pa.arxiv_id = bi.arxiv_id and pa.domain_id = bi.domain_id and pa.prompt_version = $2
     left join feedback f on f.arxiv_id = bi.arxiv_id and f.domain_id = bi.domain_id
     where bi.brief_id = $1
     order by bi.rank`,
    [id, PROMPT_VERSION],
  );

  const cards = rows.map((r): Card => {
    const s2 = (r.s2 as S2Info | null) ?? null;
    const authors = (r.authors as Author[]) ?? [];
    const ai = Boolean(r.ai_available) && Boolean(r.summary);
    const breakdown = r.score_breakdown as ScoreBreakdown;
    return {
      arxivId: String(r.arxiv_id),
      domainId: Number(r.domain_id),
      title: String(r.title),
      authors,
      affiliations: [...new Set([...(s2?.affiliations ?? []), ...authors.flatMap((a) => a.affiliations ?? [])])].slice(0, 4),
      publishedAt: iso(r.published_at),
      absUrl: String(r.abs_url),
      pdfUrl: (r.pdf_url as string) ?? null,
      codeUrl: (r.code_url as string) ?? null,
      score: Number(r.final_score),
      verdict: ai ? ((r.verdict as Verdict) ?? null) : null,
      summary: ai ? String(r.summary) : fallbackSummaryText(String(r.abstract), s2),
      keyFinding: ai ? ((r.key_finding as string) ?? null) : null,
      whyItMatters: ai ? ((r.why_it_matters as string) ?? null) : null,
      clientAngle: ai ? ((r.client_angle as string) ?? null) : null,
      method: ai ? ((r.method as string) ?? null) : null,
      limitations: ai ? ((r.limitations as string) ?? null) : null,
      chips: breakdown?.chips ?? [],
      breakdown,
      aiAvailable: ai,
      closestMiss: Boolean(r.closest_miss),
      alsoRelevantTo: ((r.also_relevant_to as number[]) ?? []).map((d) => byId.get(Number(d))?.name).filter(Boolean) as string[],
      feedback: {
        verdict: (r.fb_verdict as string) ?? null,
        starred: Boolean(r.fb_starred),
        note: (r.fb_note as string) ?? null,
        clientTag: (r.fb_client_tag as string) ?? null,
      },
    };
  });

  const headlines = (b.domain_headlines as Record<string, string | null>) ?? {};
  const notices = (b.notices as string[]) ?? [];
  const sectionIds = Object.keys(headlines).map(Number);
  for (const c of cards) if (!sectionIds.includes(c.domainId)) sectionIds.push(c.domainId);
  const rank = { high: 0, normal: 1, low: 2 } as const;

  const sections: BriefSection[] = sectionIds
    .map((did) => {
      const d = byId.get(did);
      const mine = cards.filter((c) => c.domainId === did);
      const name = d?.name ?? `Domain ${did}`;
      return {
        domain: { id: did, name, priority: d?.priority ?? "normal" },
        headline: headlines[did] ?? null,
        cards: mine.filter((c) => !c.closestMiss),
        closestMiss: mine.find((c) => c.closestMiss) ?? null,
        notice: notices.find((n) => n.startsWith(`${name}:`)) ?? null,
      };
    })
    .sort((a, b) => rank[a.domain.priority] - rank[b.domain.priority] || (b.cards[0]?.score ?? 0) - (a.cards[0]?.score ?? 0));

  // Failed domains have no headline entry; surface them from notices so the brief shows the gap.
  for (const n of notices) {
    const d = domains.find((x) => n.startsWith(`${x.name}:`));
    if (d && !sections.some((s) => s.domain.id === d.id))
      sections.push({ domain: { id: d.id, name: d.name, priority: d.priority }, headline: null, cards: [], closestMiss: null, notice: n });
  }

  return {
    id: String(b.id),
    status: b.status as BriefView["status"],
    windowStart: iso(b.window_start),
    windowEnd: iso(b.window_end),
    headline: (b.headline as string) ?? null,
    notices: notices.filter((n) => !domains.some((d) => n.startsWith(`${d.name}:`))),
    stats: (b.stats as BriefView["stats"]) ?? {},
    readingMinutes: b.reading_minutes == null ? null : Number(b.reading_minutes),
    emailedAt: b.emailed_at ? iso(b.emailed_at) : null,
    createdAt: iso(b.created_at),
    runId: (b.run_id as string) ?? null,
    sections,
  };
}

export async function latestBriefId(): Promise<string | null> {
  const r = await q1<{ id: string }>("select id from briefs order by created_at desc limit 1");
  return r?.id ?? null;
}

// ---------------------------------------------------------------- formatting helpers

export function fmtDate(isoStr: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(isoStr).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", ...opts });
}

export function authorLine(authors: Author[]) {
  const names = authors.map((a) => a.name);
  return names.length > 3 ? `${names.slice(0, 3).join(", ")} and others` : names.join(", ");
}

export function statsLine(v: BriefView) {
  const s = v.stats;
  return `${s.scanned ?? 0} papers scanned across ${s.domains ?? v.sections.length} domain${(s.domains ?? 0) === 1 ? "" : "s"} · ${s.surfaced ?? 0} included`;
}

export function briefSubject(v: BriefView) {
  const week = fmtDate(v.windowEnd);
  return `Research Pulse · Week of ${week} · ${v.stats.surfaced ?? 0} papers across ${v.sections.filter((s) => s.cards.length).length} domains`;
}

export function briefToMarkdown(v: BriefView, appUrl?: string) {
  const lines: string[] = [];
  lines.push(`# Research Pulse — ${fmtDate(v.windowStart)} to ${fmtDate(v.windowEnd)}`, "");
  if (v.headline) lines.push(v.headline, "");
  lines.push(`_${statsLine(v)} · ~${v.readingMinutes ?? "?"} min read_`, "");
  for (const n of v.notices) lines.push(`> ⚠️ ${n}`);
  if (v.notices.length) lines.push("");
  for (const s of v.sections) {
    lines.push(`## ${s.domain.name}`, "");
    if (s.notice) lines.push(`> ⚠️ ${s.notice}`, "");
    if (s.headline) lines.push(`_${s.headline}_`, "");
    for (const c of s.cards) {
      lines.push(`### [${c.title}](${c.absUrl})`);
      lines.push(`${authorLine(c.authors)} · ${fmtDate(c.publishedAt)} · **${c.verdict ?? "—"}** · score ${c.score.toFixed(1)}`, "");
      lines.push(`- **Summary:** ${c.summary}`);
      if (c.keyFinding) lines.push(`- **Key finding:** ${c.keyFinding}`);
      if (c.whyItMatters) lines.push(`- **Why it matters:** ${c.whyItMatters}`);
      if (c.clientAngle) lines.push(`- **Client angle:** ${c.clientAngle}`);
      if (c.method) lines.push(`- **Method:** ${c.method}`);
      if (c.limitations) lines.push(`- **Limitations:** ${c.limitations}`);
      if (c.chips.length) lines.push(`- **Why ranked:** ${c.chips.join(" · ")}`);
      const links = [`[arXiv](${c.absUrl})`, c.pdfUrl && `[PDF](${c.pdfUrl})`, c.codeUrl && `[Code](${c.codeUrl})`].filter(Boolean);
      lines.push(`- ${links.join(" · ")}`, "");
    }
    if (!s.cards.length && s.closestMiss) lines.push(`Closest miss: [${s.closestMiss.title}](${s.closestMiss.absUrl})`, "");
  }
  if (appUrl) lines.push(`---`, `[Open in Research Pulse](${appUrl}/briefs/${v.id})`);
  return lines.join("\n");
}
