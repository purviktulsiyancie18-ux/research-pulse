import { q, q1 } from "./db";
import { fetchDomainPapers, keywordHits } from "./arxiv";
import { fetchHuggingFace, fetchSemanticScholar } from "./signals";
import { PASS1_BATCH, PROMPT_VERSION, runHeadline, runPass1, runPass2, type Pass2Paper } from "./analysis";
import { geminiModel, mockGemini } from "./gemini";
import {
  assignDomains,
  effectiveThreshold,
  estimateMinutes,
  scorePaper,
  slotsFor,
  trimToReadingTime,
  watchMatches,
  wordCount,
  type TrimSection,
} from "./ranking";
import { getDomains, getSettings } from "./repo";
import { sendBrief } from "./email";
import type { Analysis, Domain, DomainProgress, Paper, ScoreBreakdown, Settings } from "./types";

export const TIME_GUARD_MS = 240_000;
const PASS1_CAP = 120; // max candidates triaged per domain (3 Gemini calls)
const SHORTLIST = 10;
const RELEVANCE_MIN = 6;

type Row = Record<string, unknown>;

interface RunStats {
  scanned: number;
  kept: number;
  surfaced: number;
  gemini_calls: number;
  arxiv_requests: number;
  s2_ok: boolean | null;
  hf_ok: boolean | null;
  ai_ok: boolean;
  time_guard: boolean;
  duration_ms: number;
  per_domain: Record<string, { scanned: number; candidates: number; surfaced: number; error?: string }>;
  calls: { service: string; status: string; ms: number }[];
}

interface Ctx {
  runId: string;
  t0: number;
  settings: Settings;
  stats: RunStats;
  excluded: Set<string>;
  usefulAuthors: Set<string>;
  start: Date;
  end: Date;
}

interface Scored {
  domainId: number;
  paper: Paper;
  final: number;
  breakdown: ScoreBreakdown;
  ai: boolean;
  words: number;
}

interface DomainResult {
  domain: Domain;
  scored: Scored[];
  headline: string | null;
  error: string | null;
  aiFailed: boolean;
  skipped: boolean;
}

const elapsed = (ctx: Ctx) => Date.now() - ctx.t0;
const overTime = (ctx: Ctx) => elapsed(ctx) > TIME_GUARD_MS;

async function timed<T>(ctx: Ctx, service: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now();
  try {
    const out = await fn();
    ctx.stats.calls.push({ service, status: "ok", ms: Date.now() - t });
    return out;
  } catch (e) {
    ctx.stats.calls.push({ service, status: "error", ms: Date.now() - t });
    throw e;
  }
}

async function setProgress(runId: string, domainId: number, status: DomainProgress) {
  await q("update runs set progress = progress || $2::jsonb where id = $1", [runId, JSON.stringify({ [domainId]: status })]);
}

function emptyStats(): RunStats {
  return {
    scanned: 0,
    kept: 0,
    surfaced: 0,
    gemini_calls: 0,
    arxiv_requests: 0,
    s2_ok: null,
    hf_ok: null,
    ai_ok: true,
    time_guard: false,
    duration_ms: 0,
    per_domain: {},
    calls: [],
  };
}

// ---------------------------------------------------------------- context loading

export async function deliveredPaperIds(): Promise<Set<string>> {
  const rows = await q<{ arxiv_id: string }>(
    `select distinct bi.arxiv_id from brief_items bi join briefs b on b.id = bi.brief_id
     where b.status = 'delivered' and not bi.closest_miss`,
  );
  return new Set(rows.map((r) => r.arxiv_id));
}

async function loadExclusions() {
  const delivered = await deliveredPaperIds();
  const notUseful = await q<{ arxiv_id: string }>("select distinct arxiv_id from feedback where verdict = 'not_useful'");
  for (const r of notUseful) delivered.add(r.arxiv_id);
  return delivered;
}

async function loadUsefulAuthors(): Promise<Set<string>> {
  const rows = await q<{ authors: { name: string }[] }>(
    `select distinct p.arxiv_id, p.authors from feedback f join papers p on p.arxiv_id = f.arxiv_id
     where f.verdict = 'useful' or f.starred`,
  );
  const counts = new Map<string, number>();
  for (const r of rows) for (const a of r.authors ?? []) counts.set(a.name, (counts.get(a.name) ?? 0) + 1);
  return new Set([...counts].filter(([, n]) => n >= 2).map(([name]) => name));
}

async function feedbackExamples(domainId: number) {
  // Useful = marked Useful or bookmarked; Not useful = marked Not useful.
  const rows = await q<{ title: string; verdict: string | null }>(
    `select p.title, f.verdict from feedback f join papers p on p.arxiv_id = f.arxiv_id
     where f.domain_id = $1 and (f.verdict is not null or f.starred) order by f.updated_at desc limit 6`,
    [domainId],
  );
  return {
    usefulTitles: rows.filter((r) => r.verdict !== "not_useful").map((r) => r.title),
    notUsefulTitles: rows.filter((r) => r.verdict === "not_useful").map((r) => r.title),
  };
}

// ---------------------------------------------------------------- persistence helpers

async function upsertPapers(papers: Paper[]) {
  for (let i = 0; i < papers.length; i += 150) {
    const chunk = papers.slice(i, i + 150).map((p) => ({
      ...p,
      published_at: p.published_at.toISOString(),
      updated_at: p.updated_at ? p.updated_at.toISOString() : null,
    }));
    await q(
      `insert into papers (arxiv_id, title, abstract, authors, categories, published_at, updated_at, abs_url, pdf_url, comments, code_url, hf_upvotes, s2)
       select x.arxiv_id, x.title, x.abstract, x.authors, x.categories, x.published_at, x.updated_at, x.abs_url, x.pdf_url, x.comments, x.code_url, coalesce(x.hf_upvotes, 0), x.s2
       from jsonb_to_recordset($1::jsonb) as x(arxiv_id text, title text, abstract text, authors jsonb, categories text[],
         published_at timestamptz, updated_at timestamptz, abs_url text, pdf_url text, comments text, code_url text, hf_upvotes int, s2 jsonb)
       on conflict (arxiv_id) do update set
         title = excluded.title, abstract = excluded.abstract, authors = excluded.authors, updated_at = excluded.updated_at,
         comments = excluded.comments,
         code_url = coalesce(excluded.code_url, papers.code_url),
         hf_upvotes = greatest(excluded.hf_upvotes, papers.hf_upvotes),
         s2 = coalesce(excluded.s2, papers.s2),
         fetched_at = now()`,
      [JSON.stringify(chunk)],
    );
  }
}

function toAnalysis(r: Row): Analysis {
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    relevance: num(r.relevance),
    relevance_reason: (r.relevance_reason as string) ?? null,
    summary: (r.summary as string) ?? null,
    key_finding: (r.key_finding as string) ?? null,
    why_it_matters: (r.why_it_matters as string) ?? null,
    client_angle: (r.client_angle as string) ?? null,
    method: (r.method as string) ?? null,
    limitations: (r.limitations as string) ?? null,
    verdict: (r.verdict as Analysis["verdict"]) ?? null,
    significance: num(r.significance),
    significance_reasons: (r.significance_reasons as string[]) ?? null,
  };
}

async function cachedAnalysis(domainId: number, ids: string[]): Promise<Map<string, Analysis>> {
  if (!ids.length) return new Map();
  const rows = await q<Row>(
    `select * from paper_analysis where domain_id = $1 and prompt_version = $2 and arxiv_id = any($3)`,
    [domainId, PROMPT_VERSION, ids],
  );
  return new Map(rows.map((r) => [String(r.arxiv_id), toAnalysis(r)]));
}

async function saveRelevance(domainId: number, rel: Map<string, { relevance: number; reason: string }>) {
  if (!rel.size) return;
  const rows = [...rel].map(([id, v]) => ({ arxiv_id: id, relevance: v.relevance, reason: v.reason }));
  await q(
    `insert into paper_analysis (arxiv_id, domain_id, prompt_version, relevance, relevance_reason, model)
     select x.arxiv_id, $1, $2, x.relevance, x.reason, $3 from jsonb_to_recordset($4::jsonb) as x(arxiv_id text, relevance numeric, reason text)
     on conflict (arxiv_id, domain_id, prompt_version) do update set relevance = excluded.relevance, relevance_reason = excluded.relevance_reason`,
    [domainId, PROMPT_VERSION, mockGemini() ? "mock" : geminiModel(), JSON.stringify(rows)],
  );
}

async function saveAnalysis(domainId: number, papers: Pass2Paper[]) {
  if (!papers.length) return;
  await q(
    `insert into paper_analysis (arxiv_id, domain_id, prompt_version, summary, key_finding, why_it_matters, client_angle, method, limitations, verdict, significance, significance_reasons, model)
     select x.id, $1, $2, x.summary, x.key_finding, x.why_it_matters, x.client_angle, x.method, x.limitations, x.verdict, x.significance, x.significance_reasons, $3
     from jsonb_to_recordset($4::jsonb) as x(id text, summary text, key_finding text, why_it_matters text, client_angle text, method text, limitations text, verdict text, significance numeric, significance_reasons text[])
     on conflict (arxiv_id, domain_id, prompt_version) do update set
       summary = excluded.summary, key_finding = excluded.key_finding, why_it_matters = excluded.why_it_matters,
       client_angle = excluded.client_angle, method = excluded.method, limitations = excluded.limitations,
       verdict = excluded.verdict, significance = excluded.significance, significance_reasons = excluded.significance_reasons, model = excluded.model`,
    [domainId, PROMPT_VERSION, mockGemini() ? "mock" : geminiModel(), JSON.stringify(papers)],
  );
}

// ---------------------------------------------------------------- stages

async function enrich(ctx: Ctx, papers: Paper[]) {
  const ids = [...new Set(papers.map((p) => p.arxiv_id))];
  const [s2, hf] = await Promise.all([
    ctx.settings.sources.semantic_scholar
      ? timed(ctx, "semantic_scholar", () => fetchSemanticScholar(ids)).catch(() => null)
      : Promise.resolve(null),
    ctx.settings.sources.huggingface
      ? timed(ctx, "huggingface", () => fetchHuggingFace(ctx.start, ctx.end)).catch(() => ({ map: new Map(), ok: false }))
      : Promise.resolve(null),
  ]);
  ctx.stats.s2_ok = ctx.settings.sources.semantic_scholar ? s2 !== null : null;
  ctx.stats.hf_ok = ctx.settings.sources.huggingface ? Boolean(hf?.ok) : null;
  for (const p of papers) {
    const info = s2?.get(p.arxiv_id);
    if (info) p.s2 = info;
    const h = hf?.map.get(p.arxiv_id);
    if (h) {
      p.hf_upvotes = h.upvotes;
      if (h.githubRepo && !p.code_url) p.code_url = h.githubRepo;
    }
  }
}

function paperWords(p: Paper, a: Analysis | null, ai: boolean) {
  if (!ai || !a) return wordCount(p.title) + wordCount(fallbackSummary(p));
  return [p.title, a.summary, a.key_finding, a.why_it_matters, a.client_angle, a.method, a.limitations].reduce(
    (n, s) => n + wordCount(s),
    0,
  );
}

export function fallbackSummary(p: Pick<Paper, "abstract" | "s2">) {
  if (p.s2?.tldr) return p.s2.tldr;
  return p.abstract.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
}

async function analyseDomain(ctx: Ctx, domain: Domain, candidates: Paper[]): Promise<Omit<DomainResult, "domain" | "error" | "skipped">> {
  if (!candidates.length) return { scored: [], headline: null, aiFailed: false };
  const hits = new Map(candidates.map((p) => [p.arxiv_id, keywordHits(p, domain.keywords)]));
  const maxHits = Math.max(1, ...hits.values());
  const kwRel = (p: Paper) => (10 * (hits.get(p.arxiv_id) ?? 0)) / maxHits;

  const pool = [...candidates]
    .sort((a, b) => kwRel(b) - kwRel(a) || b.hf_upvotes - a.hf_upvotes)
    .slice(0, PASS1_CAP);
  const cache = await cachedAnalysis(domain.id, pool.map((p) => p.arxiv_id));
  const onCall = () => void ctx.stats.gemini_calls++;

  // Pass 1 — relevance (cached rows are reused)
  const relevance = new Map<string, number>();
  for (const p of pool) {
    const c = cache.get(p.arxiv_id);
    if (c?.relevance != null) relevance.set(p.arxiv_id, c.relevance);
  }
  let pass1Failed = false;
  const need = pool.filter((p) => !relevance.has(p.arxiv_id));
  for (let i = 0; i < need.length && !pass1Failed; i += PASS1_BATCH) {
    if (overTime(ctx)) {
      ctx.stats.time_guard = true;
      pass1Failed = true;
      break;
    }
    try {
      const out = await timed(ctx, "gemini:pass1", () => runPass1(domain, need.slice(i, i + PASS1_BATCH), onCall));
      await saveRelevance(domain.id, out);
      for (const [id, v] of out) relevance.set(id, v.relevance);
    } catch {
      pass1Failed = true;
    }
  }
  const relOf = (p: Paper) => relevance.get(p.arxiv_id) ?? (pass1Failed ? kwRel(p) : 0);

  let shortlist = pool
    .filter((p) => relOf(p) >= RELEVANCE_MIN || (pass1Failed && !relevance.has(p.arxiv_id)))
    .sort((a, b) => relOf(b) - relOf(a) || b.hf_upvotes - a.hf_upvotes)
    .slice(0, SHORTLIST);
  if (!shortlist.length) shortlist = [...pool].sort((a, b) => relOf(b) - relOf(a)).slice(0, 1); // for "closest miss"

  // Pass 2 — analysis (only for papers without a cached summary)
  const analyses = new Map<string, Analysis>();
  for (const p of shortlist) {
    const c = cache.get(p.arxiv_id);
    if (c?.summary) analyses.set(p.arxiv_id, c);
  }
  let headline: string | null = null;
  let pass2Failed = false;
  const need2 = shortlist.filter((p) => !analyses.has(p.arxiv_id));
  if (need2.length) {
    if (overTime(ctx)) {
      ctx.stats.time_guard = true;
      pass2Failed = true;
    } else {
      try {
        const ex = await feedbackExamples(domain.id);
        const out = await timed(ctx, "gemini:pass2", () =>
          runPass2(
            domain,
            need2,
            { clientLens: ctx.settings.client_lens, detailLevel: ctx.settings.detail_level, ...ex },
            onCall,
          ),
        );
        await saveAnalysis(domain.id, out.papers);
        headline = out.domain_headline || null;
        for (const pp of out.papers) {
          analyses.set(pp.id, {
            relevance: relevance.get(pp.id) ?? null,
            relevance_reason: null,
            summary: pp.summary,
            key_finding: pp.key_finding,
            why_it_matters: pp.why_it_matters,
            client_angle: pp.client_angle,
            method: pp.method ?? null,
            limitations: pp.limitations ?? null,
            verdict: pp.verdict,
            significance: pp.significance,
            significance_reasons: pp.significance_reasons,
          });
        }
      } catch {
        pass2Failed = true;
      }
    }
  }

  const avail = { s2: ctx.stats.s2_ok !== false, hf: ctx.stats.hf_ok !== false };
  const scored: Scored[] = shortlist.map((p) => {
    const a = analyses.get(p.arxiv_id) ?? null;
    const ai = Boolean(a?.summary) && a?.significance != null;
    const affiliations = [...(p.s2?.affiliations ?? []), ...p.authors.flatMap((x) => x.affiliations ?? [])];
    const watch = watchMatches(
      { title: p.title, abstract: p.abstract, authors: p.authors.map((x) => x.name), affiliations },
      { authors: ctx.settings.watchlist_authors, orgs: ctx.settings.watchlist_orgs, terms: ctx.settings.watchlist_terms },
    );
    const { final, breakdown } = scorePaper(
      {
        significance: ai ? (a!.significance as number) : null,
        significanceReasons: a?.significance_reasons ?? [],
        relevance: ai ? relOf(p) : kwRel(p),
        upvotes: p.hf_upvotes,
        maxHIndex: p.s2?.max_hindex ?? null,
        hasCode: Boolean(p.code_url),
        watch,
        usefulAuthorBoost: p.authors.some((x) => ctx.usefulAuthors.has(x.name)),
      },
      ctx.settings.ranking_style,
      avail,
    );
    return { domainId: domain.id, paper: p, final, breakdown, ai, words: paperWords(p, a, ai) };
  });
  const aiFailed = pass2Failed || (pass1Failed && !mockGemini());
  return { scored, headline, aiFailed };
}

async function processDomain(ctx: Ctx, domain: Domain, candidates: Paper[] | undefined): Promise<DomainResult> {
  if (!candidates) return { domain, scored: [], headline: null, error: "fetch failed", aiFailed: false, skipped: false };
  await setProgress(ctx.runId, domain.id, "ranking");
  try {
    const r = await analyseDomain(ctx, domain, candidates);
    await setProgress(ctx.runId, domain.id, "done");
    return { domain, ...r, error: null, skipped: false };
  } catch (e) {
    await setProgress(ctx.runId, domain.id, "failed");
    return { domain, scored: [], headline: null, error: (e as Error).message.slice(0, 200), aiFailed: false, skipped: false };
  }
}

async function fetchStage(ctx: Ctx, domains: Domain[]) {
  const cands = new Map<number, Paper[]>();
  const errors = new Map<number, string>();
  const skipped: number[] = [];
  for (const d of domains) {
    if (overTime(ctx)) {
      ctx.stats.time_guard = true;
      skipped.push(d.id);
      await setProgress(ctx.runId, d.id, "skipped");
      continue;
    }
    await setProgress(ctx.runId, d.id, "fetching");
    try {
      const res = await timed(ctx, "arxiv", () => fetchDomainPapers(d, ctx.start, ctx.end));
      ctx.stats.arxiv_requests += res.requests;
      const kept = res.papers.filter((p) => !ctx.excluded.has(p.arxiv_id));
      ctx.stats.per_domain[d.id] = { scanned: res.papers.length, candidates: kept.length, surfaced: 0 };
      cands.set(d.id, kept);
    } catch (e) {
      const msg = (e as Error).message.slice(0, 200);
      errors.set(d.id, msg);
      ctx.stats.per_domain[d.id] = { scanned: 0, candidates: 0, surfaced: 0, error: msg };
      await setProgress(ctx.runId, d.id, "failed");
    }
  }
  // Same paper object across domains so enrichment applies once.
  const unique = new Map<string, Paper>();
  for (const list of cands.values()) for (const p of list) if (!unique.has(p.arxiv_id)) unique.set(p.arxiv_id, p);
  for (const [id, list] of cands) cands.set(id, list.map((p) => unique.get(p.arxiv_id)!));
  return { cands, errors, skipped, unique: [...unique.values()] };
}

// ---------------------------------------------------------------- compose & save

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const;

interface Section {
  domain: Domain;
  items: (Scored & { also: number[]; closestMiss: boolean })[];
  headline: string | null;
}

function compose(ctx: Ctx, results: DomainResult[], exclude: Set<string> = new Set()) {
  const all = results.flatMap((r) => r.scored).filter((s) => !exclude.has(s.paper.arxiv_id));
  const assignment = assignDomains(all.map((s) => ({ arxivId: s.paper.arxiv_id, domainId: s.domainId, final: s.final })));
  const threshold = effectiveThreshold(ctx.settings);
  const sections: Section[] = [];

  for (const r of results) {
    if (r.error || r.skipped) continue;
    const mine = all
      .filter((s) => s.domainId === r.domain.id && assignment.get(s.paper.arxiv_id)?.domainId === r.domain.id)
      .sort((a, b) => b.final - a.final);
    const qualifying = mine.filter((s) => s.final >= threshold).slice(0, slotsFor(r.domain, ctx.settings));
    const items = qualifying.map((s) => ({ ...s, also: assignment.get(s.paper.arxiv_id)!.also, closestMiss: false }));
    if (!items.length) {
      const best = all.filter((s) => s.domainId === r.domain.id).sort((a, b) => b.final - a.final)[0];
      if (best && !exclude.has(best.paper.arxiv_id) && assignment.get(best.paper.arxiv_id)?.domainId === r.domain.id)
        items.push({ ...best, also: [], closestMiss: true });
    }
    let headline = r.headline;
    const real = items.filter((i) => !i.closestMiss);
    if (!real.length) headline = "Quiet week — nothing above your threshold.";
    else if (!headline) headline = `${real.length} paper${real.length === 1 ? "" : "s"} surfaced, led by “${real[0].paper.title}”.`;
    sections.push({ domain: r.domain, items, headline });
  }

  sections.sort(
    (a, b) =>
      PRIORITY_RANK[a.domain.priority] - PRIORITY_RANK[b.domain.priority] ||
      (b.items[0]?.final ?? 0) - (a.items[0]?.final ?? 0),
  );
  return sections;
}

function applyReadingCap(ctx: Ctx, sections: Section[], headline: string | null) {
  const trim: TrimSection[] = sections.map((s) => ({
    domainId: s.domain.id,
    priority: s.domain.priority,
    headlineWords: wordCount(s.headline),
    cards: s.items.filter((i) => !i.closestMiss).map((i) => ({ id: i.paper.arxiv_id, score: i.final, words: i.words })),
  }));
  trimToReadingTime(wordCount(headline), trim, ctx.settings.reading_minutes);
  for (const s of sections) {
    const keep = new Set(trim.find((t) => t.domainId === s.domain.id)!.cards.map((c) => c.id));
    s.items = s.items.filter((i) => i.closestMiss || keep.has(i.paper.arxiv_id));
  }
  return Math.round(estimateMinutes(wordCount(headline), trim) * 10) / 10;
}

async function insertItems(briefId: string, sections: Section[]) {
  const rows = sections.flatMap((s) =>
    s.items.map((it, idx) => ({
      domain_id: s.domain.id,
      arxiv_id: it.paper.arxiv_id,
      rank: idx + 1,
      final_score: it.final,
      score_breakdown: it.breakdown,
      also_relevant_to: it.also,
      ai_available: it.ai,
      closest_miss: it.closestMiss,
    })),
  );
  if (!rows.length) return;
  await q(
    `insert into brief_items (brief_id, domain_id, arxiv_id, rank, final_score, score_breakdown, also_relevant_to, ai_available, closest_miss)
     select $1, x.domain_id, x.arxiv_id, x.rank, x.final_score, x.score_breakdown, x.also_relevant_to, x.ai_available, x.closest_miss
     from jsonb_to_recordset($2::jsonb) as x(domain_id int, arxiv_id text, rank int, final_score numeric, score_breakdown jsonb,
       also_relevant_to int[], ai_available boolean, closest_miss boolean)
     on conflict (brief_id, arxiv_id) do nothing`,
    [briefId, JSON.stringify(rows)],
  );
}

function buildNotices(ctx: Ctx, results: DomainResult[]) {
  const notices: string[] = [];
  for (const r of results) {
    if (r.skipped) notices.push(`${r.domain.name}: skipped — the run hit its time limit. Retry this domain from Run history.`);
    else if (r.error) notices.push(`${r.domain.name}: could not be processed (${r.error}). Retry this domain from Run history.`);
  }
  if (results.some((r) => r.aiFailed))
    notices.push("AI summary unavailable for some papers (Gemini did not respond) — showing titles and abstracts ranked by signals.");
  if (ctx.stats.s2_ok === false) notices.push("Semantic Scholar was unavailable — author signals were skipped this run.");
  if (ctx.stats.hf_ok === false) notices.push("Hugging Face was unavailable — community upvotes were skipped this run.");
  if (ctx.stats.time_guard) notices.push("The run reached its time limit; this brief contains what was finished.");
  return notices;
}

// ---------------------------------------------------------------- entry points

export async function executeRun(runId: string): Promise<void> {
  const t0 = Date.now();
  const run = await q1<Row>("select * from runs where id = $1", [runId]);
  if (!run) throw new Error(`Run ${runId} not found`);
  const stats = emptyStats();
  try {
    await q("update runs set status = 'running', started_at = now() where id = $1", [runId]);
    const settings = await getSettings();
    const domainIds = (run.domain_ids as number[]).map(Number);
    const domains = (await getDomains()).filter((d) => domainIds.includes(d.id));
    const ctx: Ctx = {
      runId,
      t0,
      settings,
      stats,
      excluded: await loadExclusions(),
      usefulAuthors: await loadUsefulAuthors(),
      start: new Date(run.window_start as string),
      end: new Date(run.window_end as string),
    };

    const { cands, errors, skipped, unique } = await fetchStage(ctx, domains);
    stats.scanned = Object.values(stats.per_domain).reduce((a, d) => a + d.scanned, 0);
    stats.kept = unique.length;

    for (const d of domains) if (cands.has(d.id)) await setProgress(runId, d.id, "enriching");
    await enrich(ctx, unique);
    await upsertPapers(unique);

    const results = await Promise.all(
      domains.map(async (d): Promise<DomainResult> => {
        if (skipped.includes(d.id)) return { domain: d, scored: [], headline: null, error: null, aiFailed: false, skipped: true };
        if (errors.has(d.id)) return { domain: d, scored: [], headline: null, error: errors.get(d.id)!, aiFailed: false, skipped: false };
        return processDomain(ctx, d, cands.get(d.id));
      }),
    );
    stats.ai_ok = !results.some((r) => r.aiFailed);

    const sections = compose(ctx, results);
    let headline: string | null = null;
    const withPapers = sections.filter((s) => s.items.some((i) => !i.closestMiss && i.ai));
    if (withPapers.length && !overTime(ctx)) {
      try {
        headline = await timed(ctx, "gemini:headline", () =>
          runHeadline(
            withPapers.map((s) => ({
              domain: s.domain.name,
              headline: s.headline ?? "",
              topTitles: s.items.filter((i) => !i.closestMiss).slice(0, 3).map((i) => i.paper.title),
            })),
            () => void stats.gemini_calls++,
          ),
        );
      } catch {
        headline = null;
      }
    }
    const minutes = applyReadingCap(ctx, sections, headline);
    for (const s of sections) {
      const surfaced = s.items.filter((i) => !i.closestMiss).length;
      stats.surfaced += surfaced;
      if (stats.per_domain[s.domain.id]) stats.per_domain[s.domain.id].surfaced = surfaced;
    }
    const notices = buildNotices(ctx, results);
    stats.duration_ms = Date.now() - t0;

    const brief = await q1<{ id: string }>(
      `insert into briefs (run_id, window_start, window_end, headline, domain_headlines, notices, stats, reading_minutes)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8) returning id`,
      [
        runId,
        ctx.start.toISOString(),
        ctx.end.toISOString(),
        headline,
        JSON.stringify(Object.fromEntries(sections.map((s) => [s.domain.id, s.headline]))),
        notices,
        JSON.stringify({
          scanned: stats.scanned,
          domains: domains.length,
          surfaced: stats.surfaced,
          ai_ok: stats.ai_ok,
          per_domain: stats.per_domain,
        }),
        minutes,
      ],
    );
    const briefId = brief!.id;
    await insertItems(briefId, sections);

    const anyFailed = results.some((r) => r.error || r.skipped) || stats.time_guard;
    const allFailed = results.length > 0 && results.every((r) => r.error || r.skipped);
    const status = allFailed ? "failed" : anyFailed ? "partial" : "succeeded";
    stats.duration_ms = Date.now() - t0;
    await q(
      `update runs set status = $2, brief_id = $3, stats = $4::jsonb, finished_at = now(), error = $5 where id = $1`,
      [runId, status, briefId, JSON.stringify(stats), allFailed ? "All domains failed" : null],
    );

    if (run.send_email) {
      try {
        await sendBrief(briefId);
      } catch (e) {
        await q("update briefs set notices = array_append(notices, $2) where id = $1", [
          briefId,
          `Email failed: ${(e as Error).message.slice(0, 200)}`,
        ]);
      }
    }
  } catch (e) {
    stats.duration_ms = Date.now() - t0;
    await q(`update runs set status = 'failed', error = $2, stats = $3::jsonb, finished_at = now() where id = $1`, [
      runId,
      (e as Error).message.slice(0, 500),
      JSON.stringify(stats),
    ]);
  }
}

/** Re-run a single domain of an existing run and merge its papers into the same brief. */
export async function retryDomain(runId: string, domainId: number): Promise<void> {
  const t0 = Date.now();
  const run = await q1<Row>("select * from runs where id = $1", [runId]);
  if (!run?.brief_id) throw new Error("Run has no brief to merge into");
  const briefId = String(run.brief_id);
  const settings = await getSettings();
  const domain = (await getDomains()).find((d) => d.id === domainId);
  if (!domain) throw new Error("Domain not found");
  const prevStats = (run.stats ?? emptyStats()) as RunStats;
  const ctx: Ctx = {
    runId,
    t0,
    settings,
    stats: { ...emptyStats(), per_domain: prevStats.per_domain ?? {}, gemini_calls: prevStats.gemini_calls ?? 0 },
    excluded: await loadExclusions(),
    usefulAuthors: await loadUsefulAuthors(),
    start: new Date(run.window_start as string),
    end: new Date(run.window_end as string),
  };
  const { cands, errors, unique } = await fetchStage(ctx, [domain]);
  let result: DomainResult;
  if (errors.has(domainId)) {
    result = { domain, scored: [], headline: null, error: errors.get(domainId)!, aiFailed: false, skipped: false };
  } else {
    await setProgress(runId, domainId, "enriching");
    await enrich(ctx, unique);
    await upsertPapers(unique);
    result = await processDomain(ctx, domain, cands.get(domainId));
  }
  if (result.error) throw new Error(result.error);

  const existing = await q<{ arxiv_id: string }>("select arxiv_id from brief_items where brief_id = $1 and domain_id <> $2", [
    briefId,
    domainId,
  ]);
  await q("delete from brief_items where brief_id = $1 and domain_id = $2", [briefId, domainId]);
  const sections = compose(ctx, [result], new Set(existing.map((r) => r.arxiv_id)));
  await insertItems(briefId, sections);
  const surfaced = sections[0]?.items.filter((i) => !i.closestMiss).length ?? 0;
  if (ctx.stats.per_domain[domainId]) ctx.stats.per_domain[domainId].surfaced = surfaced;

  await q(
    `update briefs set
       domain_headlines = domain_headlines || $2::jsonb,
       notices = array(select n from unnest(notices) n where n not like $3),
       stats = jsonb_set(jsonb_set(stats, '{per_domain}', $4::jsonb), '{surfaced}',
         to_jsonb((select count(*) from brief_items where brief_id = $1 and not closest_miss)))
     where id = $1`,
    [
      briefId,
      JSON.stringify({ [domainId]: sections[0]?.headline ?? null }),
      `${domain.name}:%`,
      JSON.stringify(ctx.stats.per_domain),
    ],
  );
  const progress = { ...((run.progress as Record<string, string>) ?? {}), [domainId]: "done" };
  const stillFailed = Object.values(progress).some((s) => s === "failed" || s === "skipped");
  await q(
    `update runs set progress = $2::jsonb, status = $3,
       stats = jsonb_set(jsonb_set(stats, '{per_domain}', $4::jsonb), '{gemini_calls}', to_jsonb($5::int)) where id = $1`,
    [runId, JSON.stringify(progress), stillFailed ? "partial" : "succeeded", JSON.stringify(ctx.stats.per_domain), ctx.stats.gemini_calls],
  );
}
