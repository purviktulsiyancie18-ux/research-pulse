export type Priority = "high" | "normal" | "low";
export type RankingStyle = "breakthroughs" | "balanced" | "broad";
export type DetailLevel = "short" | "standard" | "detailed";
export type Verdict = "READ" | "CLIENT" | "FYI";
export type RunMode = "since_last_brief" | "last_n_days" | "custom";
export type RunTrigger = "cron" | "manual";
export type DomainProgress = "queued" | "fetching" | "enriching" | "ranking" | "done" | "failed" | "skipped";

export interface Domain {
  id: number;
  name: string;
  description: string;
  keywords: string[];
  categories: string[];
  exclude_keywords: string[];
  priority: Priority;
  papers_per_domain: number | null;
  active: boolean;
}

export interface Settings {
  recipient_email: string | null;
  papers_per_domain: number;
  significance_threshold: number;
  ranking_style: RankingStyle;
  reading_minutes: number;
  lookback_days: number;
  detail_level: DetailLevel;
  client_lens: string | null;
  watchlist_authors: string[];
  watchlist_orgs: string[];
  watchlist_terms: string[];
  sources: { semantic_scholar: boolean; huggingface: boolean };
  delivery_paused: boolean;
  refresh_cooldown_minutes: number;
  email_manual_refresh_default: boolean;
}

export interface Author {
  name: string;
  affiliations?: string[];
}

export interface S2Info {
  tldr?: string | null;
  venue?: string | null;
  max_hindex?: number | null;
  citationCount?: number | null;
  affiliations?: string[];
}

export interface Paper {
  arxiv_id: string;
  title: string;
  abstract: string;
  authors: Author[];
  categories: string[];
  published_at: Date;
  updated_at: Date | null;
  abs_url: string;
  pdf_url: string | null;
  comments: string | null;
  code_url: string | null;
  hf_upvotes: number;
  s2: S2Info | null;
}

export interface Analysis {
  relevance: number | null;
  relevance_reason: string | null;
  summary: string | null;
  key_finding: string | null;
  why_it_matters: string | null;
  client_angle: string | null;
  method: string | null;
  limitations: string | null;
  verdict: Verdict | null;
  significance: number | null;
  significance_reasons: string[] | null;
}

export interface ScoreComponent {
  value: number;
  weight: number;
  contribution: number;
}

export interface ScoreBreakdown {
  components: Record<string, ScoreComponent>;
  watch: number;
  watch_matches: string[];
  author_boost: number;
  chips: string[];
  ai: boolean;
}
