import { describe, expect, it } from "vitest";
import {
  assignDomains,
  effectiveThreshold,
  estimateMinutes,
  normAuthor,
  normCommunity,
  redistribute,
  scorePaper,
  slotsFor,
  trimToReadingTime,
  watchMatches,
  type ScoreInput,
  type TrimSection,
} from "@/lib/ranking";

const base: ScoreInput = {
  significance: 8,
  significanceReasons: ["new SOTA"],
  relevance: 9,
  upvotes: 15,
  maxHIndex: 40,
  hasCode: true,
  watch: [],
  usefulAuthorBoost: false,
};

describe("signal normalisation", () => {
  it("community = min(10, 2*log2(1+upvotes))", () => {
    expect(normCommunity(0)).toBe(0);
    expect(normCommunity(15)).toBe(8);
    expect(normCommunity(1000)).toBe(10);
  });
  it("author = min(10, h/8)", () => {
    expect(normAuthor(40)).toBe(5);
    expect(normAuthor(200)).toBe(10);
  });
});

describe("final score per ranking style", () => {
  // sig 8, rel 9, comm 8, auth 5, code 10
  it("balanced", () => {
    expect(scorePaper(base, "balanced").final).toBeCloseTo(0.55 * 8 + 0.15 * 9 + 0.15 * 8 + 0.1 * 5 + 0.05 * 10, 2);
  });
  it("breakthroughs", () => {
    expect(scorePaper(base, "breakthroughs").final).toBeCloseTo(0.65 * 8 + 0.1 * 9 + 0.12 * 8 + 0.08 * 5 + 0.05 * 10, 2);
  });
  it("broad", () => {
    expect(scorePaper(base, "broad").final).toBeCloseTo(0.45 * 8 + 0.25 * 9 + 0.15 * 8 + 0.1 * 5 + 0.05 * 10, 2);
  });
  it("adds watch-list and author boosts, clamped to 10", () => {
    const s = scorePaper({ ...base, watch: ["SWE-bench"], usefulAuthorBoost: true }, "balanced");
    expect(s.final).toBeCloseTo(7.95 + 1.5 + 0.5 > 10 ? 10 : 7.95 + 2, 2);
    expect(s.breakdown.chips).toContain("Watch-list: SWE-bench");
    expect(s.breakdown.chips).toContain("You found this author useful");
    expect(scorePaper({ ...base, significance: 10, relevance: 10, upvotes: 5000, maxHIndex: 200, watch: ["x"] }, "balanced").final).toBe(10);
  });
  it("explains the ranking with chips", () => {
    const chips = scorePaper(base, "balanced").breakdown.chips;
    expect(chips).toEqual(["new SOTA", "Senior authors (h-index 40)", "15 upvotes", "Code released"]);
  });
  it("uses the signal-only formula when Gemini is unavailable", () => {
    const s = scorePaper({ ...base, significance: null }, "balanced");
    expect(s.breakdown.ai).toBe(false);
    expect(s.final).toBeCloseTo(0.5 * 9 + 0.25 * 8 + 0.15 * 5 + 0.1 * 10, 2);
  });
  it("redistributes weights when a source is down", () => {
    const w = redistribute({ a: 0.5, b: 0.3, c: 0.2 }, ["c"]);
    expect(w.a + w.b).toBeCloseTo(1);
    expect(w.a / w.b).toBeCloseTo(0.5 / 0.3);
    const s = scorePaper(base, "balanced", { s2: false, hf: true });
    expect(s.breakdown.components.auth.weight).toBe(0);
  });
});

describe("threshold and caps", () => {
  it("threshold shifts by style", () => {
    expect(effectiveThreshold({ significance_threshold: 5, ranking_style: "breakthroughs" })).toBe(6.5);
    expect(effectiveThreshold({ significance_threshold: 5, ranking_style: "broad" })).toBe(4);
  });
  it("slots depend on style, override and priority", () => {
    const s = { papers_per_domain: 4, ranking_style: "balanced" as const };
    expect(slotsFor({ priority: "normal", papers_per_domain: null }, s)).toBe(4);
    expect(slotsFor({ priority: "high", papers_per_domain: null }, s)).toBe(5);
    expect(slotsFor({ priority: "low", papers_per_domain: 1 }, s)).toBe(1);
    expect(slotsFor({ priority: "normal", papers_per_domain: null }, { ...s, ranking_style: "breakthroughs" })).toBe(3);
    expect(slotsFor({ priority: "normal", papers_per_domain: 2 }, { ...s, ranking_style: "broad" })).toBe(4);
  });
});

describe("dedupe across domains", () => {
  it("keeps a paper under its highest-scoring domain and notes the others", () => {
    const a = assignDomains([
      { arxivId: "p1", domainId: 1, final: 6 },
      { arxivId: "p1", domainId: 2, final: 8 },
      { arxivId: "p1", domainId: 3, final: 7 },
      { arxivId: "p2", domainId: 1, final: 5 },
    ]);
    expect(a.get("p1")).toEqual({ domainId: 2, final: 8, also: [1, 3] });
    expect(a.get("p2")).toEqual({ domainId: 1, final: 5, also: [] });
  });
});

describe("watch-list matching", () => {
  it("matches authors, orgs and terms", () => {
    const m = watchMatches(
      { title: "Beating SWE-bench", abstract: "", authors: ["Ada Lovelace"], affiliations: ["Google DeepMind"] },
      { authors: ["ada lovelace"], orgs: ["DeepMind"], terms: ["SWE-bench", "MMLU"] },
    );
    expect(m).toEqual(["ada lovelace", "DeepMind", "SWE-bench"]);
  });
});

describe("reading-time trimming", () => {
  const sections = (): TrimSection[] => [
    { domainId: 1, priority: "high", headlineWords: 10, cards: [{ id: "a", score: 9, words: 300 }, { id: "b", score: 6, words: 300 }] },
    { domainId: 2, priority: "low", headlineWords: 10, cards: [{ id: "c", score: 8, words: 300 }, { id: "d", score: 7, words: 300 }] },
    { domainId: 3, priority: "normal", headlineWords: 10, cards: [{ id: "e", score: 5, words: 300 }] },
  ];
  it("estimates minutes at 200 wpm", () => {
    expect(estimateMinutes(20, sections())).toBeCloseTo((20 + 30 + 1500) / 200);
  });
  it("drops lowest-priority, lowest-score cards first", () => {
    const out = trimToReadingTime(20, sections(), 6.5);
    expect(out.flatMap((s) => s.cards.map((c) => c.id))).toEqual(["a", "b", "c", "e"]);
  });
  it("never removes a domain's last card", () => {
    const out = trimToReadingTime(20, sections(), 1);
    expect(out.map((s) => s.cards.length)).toEqual([1, 1, 1]);
    expect(out[0].cards[0].id).toBe("a");
  });
});
