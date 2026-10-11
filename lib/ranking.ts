import type { Priority, RankingStyle, ScoreBreakdown, Settings } from "./types";

export const WPM = 200;

interface StyleConfig {
  weights: { sig: number; rel: number; comm: number; auth: number; code: number };
  thresholdDelta: number;
  slots: (setting: number) => number;
}

export const STYLES: Record<RankingStyle, StyleConfig> = {
  breakthroughs: {
    weights: { sig: 0.65, rel: 0.1, comm: 0.12, auth: 0.08, code: 0.05 },
    thresholdDelta: 1.5,
    slots: (s) => Math.min(s, 3),
  },
  balanced: {
    weights: { sig: 0.55, rel: 0.15, comm: 0.15, auth: 0.1, code: 0.05 },
    thresholdDelta: 0,
    slots: (s) => s,
  },
  broad: {
    weights: { sig: 0.45, rel: 0.25, comm: 0.15, auth: 0.1, code: 0.05 },
    thresholdDelta: -1,
    slots: (s) => s + 2,
  },
};

export const FALLBACK_WEIGHTS = { rel: 0.5, comm: 0.25, auth: 0.15, code: 0.1 };

const clamp = (n: number, lo = 0, hi = 10) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export const normCommunity = (upvotes: number) => clamp(2 * Math.log2(1 + Math.max(0, upvotes)));
export const normAuthor = (hIndex: number) => clamp(Math.max(0, hIndex) / 8);

/**
 * Drop weights for unavailable signals and scale the rest so the total is unchanged
 * (PRD §16: "weights redistributed proportionally").
 */
export function redistribute<K extends string>(weights: Record<K, number>, unavailable: NoInfer<K>[]): Record<K, number> {
  const total = Object.values<number>(weights).reduce((a, b) => a + b, 0);
  const keep = (Object.keys(weights) as K[]).filter((k) => !unavailable.includes(k));
  const keptTotal = keep.reduce((a, k) => a + weights[k], 0);
  const out = {} as Record<K, number>;
  for (const k of Object.keys(weights) as K[]) out[k] = keep.includes(k) && keptTotal > 0 ? (weights[k] * total) / keptTotal : 0;
  return out;
}

export interface WatchList {
  authors: string[];
  orgs: string[];
  terms: string[];
}

export function watchMatches(
  paper: { title: string; abstract: string; authors: string[]; affiliations: string[] },
  watch: WatchList,
): string[] {
  const matches: string[] = [];
  const has = (hay: string, needle: string) => needle.trim() && hay.toLowerCase().includes(needle.trim().toLowerCase());
  const authorHay = paper.authors.join(" | ");
  const affHay = paper.affiliations.join(" | ");
  const textHay = `${paper.title} ${paper.abstract}`;
  for (const a of watch.authors) if (has(authorHay, a)) matches.push(a);
  for (const o of watch.orgs) if (has(affHay, o)) matches.push(o);
  for (const t of watch.terms) if (has(textHay, t)) matches.push(t);
  return [...new Set(matches)];
}

export interface ScoreInput {
  significance: number | null; // null → Gemini unavailable (fallback formula)
  significanceReasons: string[];
  relevance: number; // 0–10 (Pass 1 or keyword-based)
  upvotes: number;
  maxHIndex: number | null;
  hasCode: boolean;
  watch: string[];
  usefulAuthorBoost: boolean;
}

export interface Availability {
  s2: boolean;
  hf: boolean;
}

export function scorePaper(input: ScoreInput, style: RankingStyle, avail: Availability = { s2: true, hf: true }) {
  const ai = input.significance !== null;
  const values = {
    sig: input.significance ?? 0,
    rel: clamp(input.relevance),
    comm: normCommunity(input.upvotes),
    auth: normAuthor(input.maxHIndex ?? 0),
    code: input.hasCode ? 10 : 0,
  };
  const unavailable: ("comm" | "auth")[] = [];
  if (!avail.hf) unavailable.push("comm");
  if (!avail.s2) unavailable.push("auth");

  let components: ScoreBreakdown["components"];
  if (ai) {
    const w = redistribute(STYLES[style].weights, unavailable);
    components = Object.fromEntries(
      (Object.keys(w) as (keyof typeof w)[]).map((k) => [
        k,
        { value: round2(values[k]), weight: round2(w[k]), contribution: round2(w[k] * values[k]) },
      ]),
    );
  } else {
    const w = redistribute(FALLBACK_WEIGHTS, unavailable);
    components = Object.fromEntries(
      (Object.keys(w) as (keyof typeof w)[]).map((k) => [
        k,
        { value: round2(values[k]), weight: round2(w[k]), contribution: round2(w[k] * values[k]) },
      ]),
    );
  }
  const watch = input.watch.length ? 1.5 : 0;
  const authorBoost = input.usefulAuthorBoost ? 0.5 : 0;
  const base = Object.values(components).reduce((a, c) => a + c.contribution, 0);
  const final = round2(clamp(base + watch + authorBoost));

  const chips: string[] = [];
  if (ai) chips.push(...input.significanceReasons.slice(0, 3));
  if ((input.maxHIndex ?? 0) >= 30) chips.push(`Senior authors (h-index ${input.maxHIndex})`);
  if (input.upvotes > 0) chips.push(`${input.upvotes} upvote${input.upvotes === 1 ? "" : "s"}`);
  if (input.hasCode) chips.push("Code released");
  for (const m of input.watch.slice(0, 2)) chips.push(`Watch-list: ${m}`);
  if (input.usefulAuthorBoost) chips.push("You found this author useful");
  if (!ai) chips.push(`Keyword relevance ${round2(values.rel)}/10`);

  const breakdown: ScoreBreakdown = {
    components,
    watch,
    watch_matches: input.watch,
    author_boost: authorBoost,
    chips,
    ai,
  };
  return { final, breakdown };
}

export function effectiveThreshold(settings: Pick<Settings, "significance_threshold" | "ranking_style">) {
  return settings.significance_threshold + STYLES[settings.ranking_style].thresholdDelta;
}

export function slotsFor(
  domain: { priority: Priority; papers_per_domain: number | null },
  settings: Pick<Settings, "papers_per_domain" | "ranking_style">,
) {
  const base = domain.papers_per_domain ?? settings.papers_per_domain;
  let slots = STYLES[settings.ranking_style].slots(base);
  if (domain.priority === "high") slots += 1;
  if (domain.priority === "low") slots -= 1;
  return Math.max(1, slots);
}

/**
 * A paper scored in several domains is shown once, under the domain where it scored highest.
 * Returns arxivId → { domainId, also } where `also` lists the other matching domains.
 */
export function assignDomains(scored: { arxivId: string; domainId: number; final: number }[]) {
  const best = new Map<string, { domainId: number; final: number; also: number[] }>();
  for (const s of scored) {
    const cur = best.get(s.arxivId);
    if (!cur) best.set(s.arxivId, { domainId: s.domainId, final: s.final, also: [] });
    else if (s.final > cur.final) {
      cur.also.push(cur.domainId);
      cur.domainId = s.domainId;
      cur.final = s.final;
    } else cur.also.push(s.domainId);
  }
  return best;
}

export const wordCount = (s: string | null | undefined) => (s ? s.trim().split(/\s+/).filter(Boolean).length : 0);

export interface TrimCard {
  id: string;
  score: number;
  words: number;
}
export interface TrimSection {
  domainId: number;
  priority: Priority;
  headlineWords: number;
  cards: TrimCard[];
}

export function estimateMinutes(headlineWords: number, sections: TrimSection[]) {
  const words = headlineWords + sections.reduce((a, s) => a + s.headlineWords + s.cards.reduce((b, c) => b + c.words, 0), 0);
  return words / WPM;
}

const PRIORITY_RANK: Record<Priority, number> = { low: 0, normal: 1, high: 2 };

/**
 * Drop lowest-scoring cards from lowest-priority domains until the brief fits the cap,
 * never removing a domain's last card. Mutates and returns `sections`.
 */
export function trimToReadingTime(headlineWords: number, sections: TrimSection[], capMinutes: number) {
  while (estimateMinutes(headlineWords, sections) > capMinutes) {
    let pick: { s: TrimSection; i: number } | null = null;
    for (const s of sections) {
      if (s.cards.length <= 1) continue;
      s.cards.forEach((c, i) => {
        if (
          !pick ||
          PRIORITY_RANK[s.priority] < PRIORITY_RANK[pick.s.priority] ||
          (PRIORITY_RANK[s.priority] === PRIORITY_RANK[pick.s.priority] && c.score < pick.s.cards[pick.i].score)
        )
          pick = { s, i };
      });
    }
    if (!pick) break;
    const { s, i } = pick as { s: TrimSection; i: number };
    s.cards.splice(i, 1);
  }
  return sections;
}
