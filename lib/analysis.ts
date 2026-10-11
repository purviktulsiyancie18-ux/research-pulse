import { z } from "zod";
import { generateJson } from "./gemini";
import type { DetailLevel, Domain, Paper } from "./types";

export const PROMPT_VERSION = "v1";
const ABSTRACT_CHARS = 1200;
export const PASS1_BATCH = 40;

const clamp10 = (n: number) => Math.max(0, Math.min(10, n));
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

// ---------------- Pass 1: relevance triage ----------------

export const pass1Zod = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      relevance: z.coerce.number().transform(clamp10),
      reason: z.string().default(""),
    }),
  ),
});
export type Pass1 = z.infer<typeof pass1Zod>;

const pass1Schema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          relevance: { type: "number" },
          reason: { type: "string" },
        },
        required: ["id", "relevance", "reason"],
      },
    },
  },
  required: ["results"],
};

const PASS1_SYSTEM =
  "You are a research assistant for a senior AI-strategy consultant. You triage new arXiv papers for one research domain. Judge only relevance to the domain as described, not quality. Return JSON only.";

export async function runPass1(
  domain: Domain,
  papers: Paper[],
  onCall?: () => void,
): Promise<Map<string, { relevance: number; reason: string }>> {
  const ids = new Set(papers.map((p) => p.arxiv_id));
  const user = [
    `Domain: ${domain.name}`,
    `What counts as relevant: ${domain.description || domain.name}`,
    `Keywords: ${domain.keywords.join(", ")}`,
    `Papers: ${JSON.stringify(papers.map((p) => ({ id: p.arxiv_id, title: p.title, abstract: truncate(p.abstract, ABSTRACT_CHARS) })))}`,
    "For each paper return relevance 0–10 (10 = squarely about this domain; 0 = unrelated) and a reason of at most 15 words.",
  ].join("\n");
  const out = await generateJson({
    system: PASS1_SYSTEM,
    user,
    jsonSchema: pass1Schema,
    zod: pass1Zod,
    onCall,
    mock: () => ({
      results: papers.map((p, i) => ({ id: p.arxiv_id, relevance: 9 - (i % 5), reason: "Mock: matches domain keywords" })),
    }),
  });
  const map = new Map<string, { relevance: number; reason: string }>();
  for (const r of out.results) if (ids.has(r.id)) map.set(r.id, { relevance: r.relevance, reason: r.reason });
  return map;
}

// ---------------- Pass 2: analysis ----------------

const verdictZod = z.preprocess(
  (v) => String(v ?? "").toUpperCase().trim(),
  z.enum(["READ", "CLIENT", "FYI"]).catch("FYI"),
);

export const pass2PaperZod = z.object({
  id: z.string(),
  summary: z.string(),
  key_finding: z.string().default(""),
  why_it_matters: z.string().default(""),
  client_angle: z.string().default(""),
  verdict: verdictZod,
  significance: z.coerce.number().transform(clamp10),
  significance_reasons: z.array(z.string()).default([]),
  method: z.string().optional(),
  limitations: z.string().optional(),
});
export const pass2Zod = z.object({
  domain_headline: z.string().default(""),
  papers: z.array(pass2PaperZod),
});
export type Pass2 = z.infer<typeof pass2Zod>;
export type Pass2Paper = z.infer<typeof pass2PaperZod>;

const pass2Schema = {
  type: "object",
  properties: {
    domain_headline: { type: "string" },
    papers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          summary: { type: "string" },
          key_finding: { type: "string" },
          why_it_matters: { type: "string" },
          client_angle: { type: "string" },
          verdict: { type: "string", enum: ["READ", "CLIENT", "FYI"] },
          significance: { type: "number" },
          significance_reasons: { type: "array", items: { type: "string" } },
          method: { type: "string" },
          limitations: { type: "string" },
        },
        required: [
          "id",
          "summary",
          "key_finding",
          "why_it_matters",
          "client_angle",
          "verdict",
          "significance",
          "significance_reasons",
        ],
      },
    },
  },
  required: ["domain_headline", "papers"],
};

const PASS2_SYSTEM =
  "You are a rigorous research analyst briefing a management consultant who advises clients on AI strategy. Be concrete and factual; use only information in the provided abstract and metadata; never invent results or numbers. If a claim is not in the abstract, do not state it. Return JSON only.";

/** Keep only papers whose id was in the input; drop duplicates. */
export function filterKnownIds<T extends { id: string }>(items: T[], known: Set<string>): T[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    if (!known.has(it.id) || seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
}

export interface Pass2Context {
  clientLens: string | null;
  detailLevel: DetailLevel;
  usefulTitles: string[];
  notUsefulTitles: string[];
}

export async function runPass2(
  domain: Domain,
  papers: Paper[],
  ctx: Pass2Context,
  onCall?: () => void,
): Promise<Pass2> {
  const detailNote =
    ctx.detailLevel === "short"
      ? "Detail level is short: keep summary to one sentence."
      : ctx.detailLevel === "detailed"
        ? 'Detail level is "detailed": also produce method (1 sentence) and limitations (1 sentence).'
        : "";
  const user = [
    `Domain: ${domain.name} — ${domain.description}`,
    `Client lens: ${ctx.clientLens || "general enterprise"}`,
    `Detail level: ${ctx.detailLevel}`,
    `Kavita found these useful before: ${ctx.usefulTitles.length ? ctx.usefulTitles.map((t) => `"${t}"`).join("; ") : "(none yet)"}. Not useful: ${ctx.notUsefulTitles.length ? ctx.notUsefulTitles.map((t) => `"${t}"`).join("; ") : "(none yet)"}.`,
    `Papers: ${JSON.stringify(
      papers.map((p) => ({
        id: p.arxiv_id,
        title: p.title,
        abstract: truncate(p.abstract, 2000),
        authors: p.authors.slice(0, 8).map((a) => a.name),
        affiliations: [...new Set([...(p.s2?.affiliations ?? []), ...p.authors.flatMap((a) => a.affiliations ?? [])])].slice(0, 6),
        venue: p.s2?.venue ?? null,
        s2_tldr: p.s2?.tldr ?? null,
        hf_upvotes: p.hf_upvotes,
        code_link: p.code_url,
        max_author_hindex: p.s2?.max_hindex ?? null,
      })),
    )}`,
    "For each paper produce: summary (≤ 2 sentences, ≤ 40 words), key_finding (1 sentence, include the metric/benchmark if stated), why_it_matters (1 sentence for a strategy consultant), client_angle (1 sentence on the business implication), verdict (READ = worth reading in full, CLIENT = worth bringing to a client, FYI = good to know), significance 0–10 (novelty, strength of evidence, new benchmark/SOTA, reframes the problem, likely impact), significance_reasons (1–3 short phrases). If detail level is \"detailed\", also produce method (1 sentence) and limitations (1 sentence). Also produce domain_headline: one sentence summarising this week in the domain.",
    detailNote,
  ]
    .filter(Boolean)
    .join("\n");

  const out = await generateJson({
    system: PASS2_SYSTEM,
    user,
    jsonSchema: pass2Schema,
    zod: pass2Zod,
    onCall,
    mock: () => ({
      domain_headline: `Mock headline: ${papers.length} notable ${domain.name} papers this week.`,
      papers: papers.map((p, i) => ({
        id: p.arxiv_id,
        summary: p.abstract.split(/(?<=\.)\s/).slice(0, 2).join(" "),
        key_finding: "Mock key finding drawn from the abstract.",
        why_it_matters: "Mock: signals where the field is heading.",
        client_angle: "Mock: relevant for enterprise pilots.",
        verdict: (["READ", "CLIENT", "FYI"] as const)[i % 3],
        significance: 8 - (i % 4),
        significance_reasons: ["Mock reason"],
      })),
    }),
  });
  const known = new Set(papers.map((p) => p.arxiv_id));
  return { domain_headline: out.domain_headline, papers: filterKnownIds(out.papers, known) };
}

// ---------------- Headline of the week ----------------

const headlineZod = z.object({ headline: z.string() });

export async function runHeadline(
  sections: { domain: string; headline: string; topTitles: string[] }[],
  onCall?: () => void,
): Promise<string> {
  const out = await generateJson({
    system:
      "You write the opening of a weekly AI-research brief for a management consultant. Use only the information given. Return JSON only.",
    user: `This week's domains:\n${JSON.stringify(sections)}\nWrite headline: 2–3 sentences naming the most important developments across domains.`,
    jsonSchema: { type: "object", properties: { headline: { type: "string" } }, required: ["headline"] },
    zod: headlineZod,
    onCall,
    mock: () => ({ headline: `Mock headline of the week across ${sections.length} domains.` }),
  });
  return out.headline.trim();
}
