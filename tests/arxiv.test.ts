import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildQueryUrl,
  buildSearchQuery,
  extractCodeUrl,
  formatArxivDate,
  hasExcluded,
  keywordHits,
  parseArxivId,
  parseAtom,
  quoteTerm,
} from "@/lib/arxiv";

describe("arXiv query builder", () => {
  it("quotes multi-word and hyphenated keywords only", () => {
    expect(quoteTerm("RAG")).toBe("RAG");
    expect(quoteTerm("retrieval augmented")).toBe('"retrieval augmented"');
    expect(quoteTerm("retrieval-augmented")).toBe('"retrieval-augmented"');
    expect(quoteTerm('  "tool use" ')).toBe('"tool use"');
  });

  it("formats dates as YYYYMMDDHHmm in UTC", () => {
    expect(formatArxivDate(new Date("2026-10-04T00:00:00Z"))).toBe("202610040000");
    expect(formatArxivDate(new Date("2026-10-11T23:59:00Z"))).toBe("202610112359");
  });

  it("ANDs category group, keyword group and date range", () => {
    const q = buildSearchQuery(
      { categories: ["cs.CL", "cs.IR"], keywords: ["retrieval augmented", "RAG"] },
      { start: new Date("2026-10-04T00:00:00Z"), end: new Date("2026-10-11T23:59:00Z") },
    );
    expect(q).toBe(
      '(cat:cs.CL OR cat:cs.IR) AND (abs:"retrieval augmented" OR ti:"retrieval augmented" OR abs:RAG OR ti:RAG) AND submittedDate:[202610040000 TO 202610112359]',
    );
  });

  it("omits empty groups and URL-encodes the whole query", () => {
    expect(buildSearchQuery({ categories: [], keywords: ["agentic"] })).toBe("(abs:agentic OR ti:agentic)");
    const url = buildQueryUrl('(cat:cs.AI) AND (abs:"tool use")', 100);
    expect(url).toContain("search_query=(cat%3Acs.AI)%20AND%20(abs%3A%22tool%20use%22)");
    expect(url).toContain("start=100");
    expect(url).toContain("sortBy=submittedDate&sortOrder=descending");
  });
});

describe("Atom parser", () => {
  const xml = readFileSync(join(__dirname, "..", "fixtures", "arxiv-sample.xml"), "utf8");

  it("parses entries into papers with version-stripped ids", () => {
    const { papers, error } = parseAtom(xml);
    expect(error).toBeNull();
    expect(papers.length).toBe(3);
    const p = papers[0];
    expect(p.arxiv_id).toMatch(/^\d{4}\.\d{4,5}$/);
    expect(p.title.length).toBeGreaterThan(5);
    expect(p.abstract).not.toMatch(/\n/);
    expect(p.authors.length).toBeGreaterThan(0);
    expect(p.categories).toContain("cs.IR");
    expect(p.abs_url).toBe(`https://arxiv.org/abs/${p.arxiv_id}`);
    expect(p.pdf_url).toMatch(/^https:\/\/arxiv\.org\/pdf\//);
    expect(p.published_at).toBeInstanceOf(Date);
    expect(Number.isNaN(p.published_at.getTime())).toBe(false);
  });

  it("reports arXiv API errors", () => {
    const err = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/api/errors#bad</id><title>Error</title><summary>malformed query</summary></entry></feed>`;
    expect(parseAtom(err)).toEqual({ papers: [], error: "malformed query" });
  });

  it("strips versions and finds code links", () => {
    expect(parseArxivId("http://arxiv.org/abs/2410.12345v3")).toBe("2410.12345");
    expect(parseArxivId("http://arxiv.org/abs/cs/0112017v1")).toBe("cs/0112017");
    expect(extractCodeUrl("Code available at https://github.com/org/repo.")).toBe("https://github.com/org/repo");
    expect(extractCodeUrl(null, "no link here")).toBeNull();
  });
});

describe("cleaning helpers", () => {
  const paper = { title: "Defect detection for medical imaging", abstract: "We study anomaly detection. Anomaly detection matters." };
  it("drops papers with exclude words, case-insensitively", () => {
    expect(hasExcluded(paper, ["Medical"])).toBe(true);
    expect(hasExcluded(paper, ["clinical"])).toBe(false);
    expect(hasExcluded(paper, [" "])).toBe(false);
  });
  it("counts keyword hits", () => {
    expect(keywordHits(paper, ["anomaly detection", "defect detection"])).toBe(3);
  });
});
