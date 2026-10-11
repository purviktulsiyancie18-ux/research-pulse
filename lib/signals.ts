import type { S2Info } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const S2_URL =
  "https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,tldr,venue,citationCount,influentialCitationCount,externalIds,authors.name,authors.hIndex,authors.affiliations";

interface S2Paper {
  tldr?: { text?: string } | null;
  venue?: string | null;
  citationCount?: number | null;
  authors?: { name?: string; hIndex?: number | null; affiliations?: string[] | null }[];
}

export function toS2Info(p: S2Paper | null): S2Info | null {
  if (!p) return null;
  const authors = p.authors ?? [];
  const hs = authors.map((a) => a.hIndex ?? 0).filter((h) => Number.isFinite(h));
  const affs = [...new Set(authors.flatMap((a) => a.affiliations ?? []).filter(Boolean))];
  return {
    tldr: p.tldr?.text ?? null,
    venue: p.venue || null,
    citationCount: p.citationCount ?? null,
    max_hindex: hs.length ? Math.max(...hs) : null,
    affiliations: affs,
  };
}

/**
 * One batch call for all papers (≤ 500 IDs). On 429 back off 2 s → 4 s → 8 s, then give up.
 * Returns null when the service could not be reached so callers can mark signals unavailable.
 */
export async function fetchSemanticScholar(arxivIds: string[]): Promise<Map<string, S2Info> | null> {
  const out = new Map<string, S2Info>();
  if (arxivIds.length === 0) return out;
  const ids = arxivIds.slice(0, 500);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.S2_API_KEY) headers["x-api-key"] = process.env.S2_API_KEY;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(S2_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: ids.map((id) => `ARXIV:${id}`) }),
        signal: AbortSignal.timeout(25_000),
        cache: "no-store",
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt < 3) {
          await sleep(2000 * 2 ** attempt);
          continue;
        }
        return null;
      }
      if (!res.ok) return null;
      const data = (await res.json()) as (S2Paper | null)[];
      data.forEach((p, i) => {
        const info = toS2Info(p);
        if (info) out.set(ids[i], info);
      });
      return out;
    } catch {
      if (attempt < 3) await sleep(2000 * 2 ** attempt);
    }
  }
  return null;
}

export interface HfSignal {
  upvotes: number;
  githubRepo: string | null;
}

/** Dates (YYYY-MM-DD, UTC) covered by the window, newest first, at most `max`. */
export function windowDates(start: Date, end: Date, max = 14): string[] {
  const dates: string[] = [];
  const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const first = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  while (d.getTime() >= first && dates.length < max) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return dates;
}

/** Best-effort community signal from HF Daily Papers; 4 requests at a time. */
export async function fetchHuggingFace(start: Date, end: Date): Promise<{ map: Map<string, HfSignal>; ok: boolean }> {
  const map = new Map<string, HfSignal>();
  const dates = windowDates(start, end);
  let failures = 0;
  const work = async (date: string) => {
    try {
      const res = await fetch(`https://huggingface.co/api/daily_papers?date=${date}`, {
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (!res.ok) {
        failures++;
        return;
      }
      const items = (await res.json()) as { paper?: { id?: string; upvotes?: number; githubRepo?: string } }[];
      if (!Array.isArray(items)) return;
      for (const it of items) {
        const id = it.paper?.id;
        if (!id) continue;
        const prev = map.get(id);
        const upvotes = Math.max(prev?.upvotes ?? 0, it.paper?.upvotes ?? 0);
        map.set(id, { upvotes, githubRepo: it.paper?.githubRepo || prev?.githubRepo || null });
      }
    } catch {
      failures++;
    }
  };
  for (let i = 0; i < dates.length; i += 4) await Promise.all(dates.slice(i, i + 4).map(work));
  return { map, ok: dates.length === 0 || failures < dates.length };
}
