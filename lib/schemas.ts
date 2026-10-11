import { z } from "zod";

const tags = z
  .array(z.string().trim().min(1).max(80))
  .max(30)
  .transform((a) => [...new Set(a)]);

export const ARXIV_CATEGORIES = [
  "cs.AI", "cs.CL", "cs.CV", "cs.LG", "cs.IR", "cs.MA", "cs.RO", "cs.SE", "cs.PL", "cs.CR",
  "cs.DB", "cs.DC", "cs.HC", "cs.NE", "cs.SD", "cs.CY", "cs.GT", "cs.SI", "eess.AS", "eess.IV",
  "eess.SP", "eess.SY", "stat.ML", "q-fin.CP", "q-bio.QM",
];

export const domainInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(""),
  keywords: tags.refine((a) => a.length > 0, "Add at least one keyword"),
  categories: z.array(z.string().regex(/^[a-z-]+(\.[A-Za-z-]+)?$/, "Invalid arXiv category")).max(10).default([]),
  exclude_keywords: tags.default([]),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  papers_per_domain: z.number().int().min(1).max(8).nullable().default(null),
  active: z.boolean().default(true),
});
export type DomainInput = z.infer<typeof domainInput>;

export const settingsInput = z
  .object({
    recipient_email: z.union([z.email(), z.literal("")]).nullable(),
    papers_per_domain: z.number().int().min(1).max(8),
    significance_threshold: z.number().min(0).max(10),
    ranking_style: z.enum(["breakthroughs", "balanced", "broad"]),
    reading_minutes: z.number().int().min(3).max(30),
    lookback_days: z.number().int().min(1).max(31),
    detail_level: z.enum(["short", "standard", "detailed"]),
    client_lens: z.string().trim().max(80).nullable(),
    watchlist_authors: tags,
    watchlist_orgs: tags,
    watchlist_terms: tags,
    sources: z.object({ semantic_scholar: z.boolean(), huggingface: z.boolean() }),
    delivery_paused: z.boolean(),
    refresh_cooldown_minutes: z.number().int().min(0).max(240),
    email_manual_refresh_default: z.boolean(),
  })
  .partial();
export type SettingsInput = z.infer<typeof settingsInput>;

export const feedbackInput = z.object({
  arxivId: z.string().min(4).max(40),
  domainId: z.number().int().positive(),
  briefId: z.string().uuid().nullable().optional(),
  verdict: z.enum(["useful", "not_useful"]).nullable().optional(),
  /** Bookmarked (stored in the `starred` column). */
  starred: z.boolean().optional(),
  note: z.string().max(2000).nullable().optional(),
  clientTag: z.string().max(80).nullable().optional(),
});
