import { XMLParser } from "fast-xml-parser";
import type { Domain, Paper } from "./types";

const ENDPOINT = "https://export.arxiv.org/api/query";
const MIN_GAP_MS = 3100;
const PAGE_SIZE = 100;
const MAX_PER_DOMAIN = 200;

/** Quote multi-word or hyphenated phrases; leave single tokens bare. */
export function quoteTerm(term: string): string {
  const t = term.trim().replace(/"/g, "");
  return /[\s-]/.test(t) ? `"${t}"` : t;
}

/** arXiv submittedDate format: YYYYMMDDHHmm in UTC. */
export function formatArxivDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

export function buildSearchQuery(
  domain: Pick<Domain, "categories" | "keywords">,
  window?: { start: Date; end: Date },
): string {
  const parts: string[] = [];
  const cats = domain.categories.filter(Boolean).map((c) => `cat:${c.trim()}`);
  if (cats.length) parts.push(`(${cats.join(" OR ")})`);
  const kws = domain.keywords
    .filter((k) => k.trim())
    .flatMap((k) => {
      const t = quoteTerm(k);
      return [`abs:${t}`, `ti:${t}`];
    });
  if (kws.length) parts.push(`(${kws.join(" OR ")})`);
  if (window) parts.push(`submittedDate:[${formatArxivDate(window.start)} TO ${formatArxivDate(window.end)}]`);
  return parts.join(" AND ");
}

export function buildQueryUrl(searchQuery: string, start = 0, max = PAGE_SIZE): string {
  return (
    `${ENDPOINT}?search_query=${encodeURIComponent(searchQuery)}` +
    `&start=${start}&max_results=${max}&sortBy=submittedDate&sortOrder=descending`
  );
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["entry", "author", "link", "category", "arxiv:affiliation"].includes(name),
});

const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

function text(node: unknown): string {
  if (node && typeof node === "object" && "#text" in node) return clean((node as { "#text": unknown })["#text"]);
  return clean(node);
}

/** Strip version: http://arxiv.org/abs/2410.12345v2 → 2410.12345 */
export function parseArxivId(idUrl: string): string {
  const m = idUrl.match(/abs\/(.+?)(v\d+)?$/);
  return (m ? m[1] : idUrl).trim();
}

export function extractCodeUrl(...texts: (string | null | undefined)[]): string | null {
  for (const t of texts) {
    const m = t?.match(/https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/i);
    if (m) return m[0].replace(/[.,;)]+$/, "");
  }
  return null;
}

export function parseAtom(xml: string): { papers: Paper[]; error: string | null } {
  const doc = parser.parse(xml);
  const feed = doc.feed ?? {};
  const entries: Record<string, unknown>[] = feed.entry ?? [];
  // arXiv reports query errors as a single entry whose id points to /api/errors
  if (entries.length === 1 && String(entries[0].id ?? "").includes("/api/errors")) {
    return { papers: [], error: text(entries[0].summary) || "arXiv query error" };
  }
  const papers: Paper[] = [];
  for (const e of entries) {
    const idUrl = text(e.id);
    if (!idUrl) continue;
    const arxivId = parseArxivId(idUrl);
    const links = (e.link as Record<string, string>[] | undefined) ?? [];
    const pdf = links.find((l) => l["@_title"] === "pdf")?.["@_href"] ?? `https://arxiv.org/pdf/${arxivId}`;
    const authors = ((e.author as Record<string, unknown>[] | undefined) ?? []).map((a) => {
      const affs = ((a["arxiv:affiliation"] as unknown[] | undefined) ?? []).map(text).filter(Boolean);
      return affs.length ? { name: text(a.name), affiliations: affs } : { name: text(a.name) };
    });
    const categories = ((e.category as Record<string, string>[] | undefined) ?? [])
      .map((c) => c["@_term"])
      .filter(Boolean);
    const comments = text(e["arxiv:comment"]) || null;
    const abstract = text(e.summary);
    papers.push({
      arxiv_id: arxivId,
      title: text(e.title),
      abstract,
      authors,
      categories,
      published_at: new Date(text(e.published) || text(e.updated)),
      updated_at: e.updated ? new Date(text(e.updated)) : null,
      abs_url: `https://arxiv.org/abs/${arxivId}`,
      pdf_url: pdf.replace(/^http:/, "https:"),
      comments,
      code_url: extractCodeUrl(comments, abstract),
      hf_upvotes: 0,
      s2: null,
    });
  }
  return { papers, error: null };
}

// ---- rate-limited fetch: one request at a time, ≥ 3.1 s apart ----
let lastCall = 0;
let chain: Promise<unknown> = Promise.resolve();

function userAgent() {
  const contact = process.env.DEFAULT_RECIPIENT;
  return `ResearchPulse/1.0${contact ? ` (mailto:${contact})` : ""}`;
}

async function rawFetch(url: string): Promise<string> {
  const run = async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent() },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`arXiv HTTP ${res.status}`);
    return res.text();
  };
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  return p;
}

/** Fetch once; on error wait 5 s and retry once (PRD §16). */
async function fetchPage(url: string): Promise<Paper[]> {
  const attempt = async () => {
    const { papers, error } = parseAtom(await rawFetch(url));
    if (error) throw new Error(`arXiv: ${error}`);
    return papers;
  };
  try {
    return await attempt();
  } catch {
    await new Promise((r) => setTimeout(r, 5000));
    return attempt();
  }
}

export function inWindow(p: Paper, start: Date, end: Date) {
  const t = p.published_at.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function hasExcluded(p: Pick<Paper, "title" | "abstract">, exclude: string[]) {
  const hay = `${p.title} ${p.abstract}`.toLowerCase();
  return exclude.some((x) => x.trim() && hay.includes(x.trim().toLowerCase()));
}

export interface FetchResult {
  papers: Paper[];
  requests: number;
  usedFallback: boolean;
}

/**
 * Fetch a domain's papers for the window, newest first. Uses the submittedDate filter;
 * if that yields nothing, falls back to a date-sorted query filtered client-side.
 */
export async function fetchDomainPapers(
  domain: Pick<Domain, "categories" | "keywords" | "exclude_keywords">,
  start: Date,
  end: Date,
): Promise<FetchResult> {
  let requests = 0;
  let usedFallback = false;
  const collect = async (query: string, clientFilter: boolean) => {
    const all: Paper[] = [];
    for (let offset = 0; offset < MAX_PER_DOMAIN; offset += PAGE_SIZE) {
      const page = await fetchPage(buildQueryUrl(query, offset));
      requests++;
      all.push(...page);
      const oldest = page[page.length - 1];
      const more = page.length === PAGE_SIZE && (!clientFilter || (oldest && oldest.published_at >= start));
      if (!more) break;
    }
    return all;
  };

  let papers = await collect(buildSearchQuery(domain, { start, end }), false);
  if (papers.length === 0) {
    usedFallback = true;
    papers = await collect(buildSearchQuery(domain), true);
  }
  const seen = new Set<string>();
  const filtered = papers.filter((p) => {
    if (seen.has(p.arxiv_id)) return false;
    seen.add(p.arxiv_id);
    return inWindow(p, start, end) && !hasExcluded(p, domain.exclude_keywords);
  });
  return { papers: filtered, requests, usedFallback };
}

/** Count keyword hits in title+abstract (used for fallback relevance). */
export function keywordHits(p: Pick<Paper, "title" | "abstract">, keywords: string[]): number {
  const hay = `${p.title} ${p.abstract}`.toLowerCase();
  let hits = 0;
  for (const k of keywords) {
    const t = k.trim().toLowerCase();
    if (!t) continue;
    let i = hay.indexOf(t);
    while (i !== -1) {
      hits++;
      i = hay.indexOf(t, i + t.length);
    }
  }
  return hits;
}
