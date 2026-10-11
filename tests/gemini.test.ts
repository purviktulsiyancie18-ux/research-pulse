import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { filterKnownIds, pass1Zod, pass2Zod } from "@/lib/analysis";

const fixture = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "gemini-pass2.json"), "utf8"));

describe("Gemini response validation", () => {
  it("accepts a valid Pass 2 response and normalises verdict + significance", () => {
    const out = pass2Zod.parse(fixture);
    expect(out.papers[0].verdict).toBe("READ");
    expect(out.papers[0].significance).toBe(7.5);
  });

  it("rejects responses missing required fields", () => {
    const bad = structuredClone(fixture);
    delete bad.papers[0].summary;
    expect(pass2Zod.safeParse(bad).success).toBe(false);
    expect(pass2Zod.safeParse({ domain_headline: "x" }).success).toBe(false);
  });

  it("maps unknown verdicts to FYI and clamps scores to 0–10", () => {
    const odd = structuredClone(fixture);
    odd.papers[0].verdict = "MAYBE";
    odd.papers[0].significance = 14;
    const out = pass2Zod.parse(odd);
    expect(out.papers[0].verdict).toBe("FYI");
    expect(out.papers[0].significance).toBe(10);
  });

  it("validates Pass 1 relevance results", () => {
    const out = pass1Zod.parse({ results: [{ id: "a", relevance: "7", reason: "on topic" }, { id: "b", relevance: -3 }] });
    expect(out.results.map((r) => r.relevance)).toEqual([7, 0]);
    expect(pass1Zod.safeParse({ results: [{ relevance: 5 }] }).success).toBe(false);
  });

  it("discards unknown and duplicate ids", () => {
    const items = [{ id: "a" }, { id: "zzz" }, { id: "b" }, { id: "a" }];
    expect(filterKnownIds(items, new Set(["a", "b"]))).toEqual([{ id: "a" }, { id: "b" }]);
  });
});
