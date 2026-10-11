-- Research Pulse schema (idempotent: safe to run more than once)

create table if not exists domains (
  id serial primary key,
  name text not null unique,
  description text not null default '',
  keywords text[] not null default '{}',
  categories text[] not null default '{}',
  exclude_keywords text[] not null default '{}',
  priority text not null default 'normal' check (priority in ('high','normal','low')),
  papers_per_domain int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  recipient_email text,
  papers_per_domain int not null default 4,
  significance_threshold numeric not null default 5.0,
  ranking_style text not null default 'balanced',
  reading_minutes int not null default 10,
  lookback_days int not null default 7,
  detail_level text not null default 'standard',
  client_lens text,
  watchlist_authors text[] not null default '{}',
  watchlist_orgs text[] not null default '{}',
  watchlist_terms text[] not null default '{}',
  sources jsonb not null default '{"semantic_scholar":true,"huggingface":true}',
  delivery_paused boolean not null default false,
  refresh_cooldown_minutes int not null default 10,
  email_manual_refresh_default boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null check (trigger in ('cron','manual')),
  mode text not null check (mode in ('since_last_brief','last_n_days','custom')),
  window_start timestamptz not null,
  window_end timestamptz not null,
  domain_ids int[] not null,
  send_email boolean not null default false,
  status text not null default 'queued',
  progress jsonb not null default '{}',      -- { "<domainId>": "fetching|enriching|ranking|done|failed" }
  stats jsonb not null default '{}',         -- scanned, kept, gemini_calls, s2_ok, hf_ok, duration_ms ...
  error text,
  brief_id uuid,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists papers (
  arxiv_id text primary key,
  title text not null,
  abstract text not null,
  authors jsonb not null,                    -- [{name, affiliations?}]
  categories text[] not null,
  published_at timestamptz not null,
  updated_at timestamptz,
  abs_url text not null,
  pdf_url text,
  comments text,
  code_url text,
  hf_upvotes int not null default 0,
  s2 jsonb,                                  -- {tldr, venue, max_hindex, citationCount, affiliations}
  fetched_at timestamptz not null default now()
);

create table if not exists paper_analysis (
  arxiv_id text references papers(arxiv_id) on delete cascade,
  domain_id int references domains(id) on delete cascade,
  prompt_version text not null,
  relevance numeric,
  relevance_reason text,
  summary text,
  key_finding text,
  why_it_matters text,
  client_angle text,
  method text,
  limitations text,
  verdict text,
  significance numeric,
  significance_reasons text[],
  model text,
  created_at timestamptz not null default now(),
  primary key (arxiv_id, domain_id, prompt_version)
);

create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references runs(id),
  status text not null default 'preview' check (status in ('preview','delivered')),
  window_start timestamptz not null,
  window_end timestamptz not null,
  headline text,
  domain_headlines jsonb not null default '{}',
  notices text[] not null default '{}',
  stats jsonb not null default '{}',
  reading_minutes numeric,
  emailed_at timestamptz,
  email_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists brief_items (
  id serial primary key,
  brief_id uuid references briefs(id) on delete cascade,
  domain_id int references domains(id) on delete cascade,
  arxiv_id text references papers(arxiv_id),
  rank int not null,
  final_score numeric not null,
  score_breakdown jsonb not null,
  also_relevant_to int[] not null default '{}',
  ai_available boolean not null default true,
  closest_miss boolean not null default false,  -- "Quiet week" best candidate below threshold
  unique (brief_id, arxiv_id)
);

create table if not exists feedback (
  id serial primary key,
  arxiv_id text references papers(arxiv_id),
  domain_id int references domains(id) on delete cascade,
  brief_id uuid references briefs(id) on delete set null,
  verdict text check (verdict in ('useful','not_useful')),
  starred boolean not null default false,       -- "Bookmarked" in the UI
  note text,
  client_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (arxiv_id, domain_id)
);

-- Deleting a domain archives it so past briefs keep their papers
alter table domains add column if not exists archived boolean not null default false;

-- Feedback v2: Read in full / Bring to client -> Useful; Bring to client also bookmarks (starred)
alter table feedback drop constraint if exists feedback_verdict_check;
update feedback set starred = true where verdict = 'client';
update feedback set verdict = 'useful' where verdict in ('read', 'client');
alter table feedback add constraint feedback_verdict_check check (verdict in ('useful', 'not_useful'));

create index if not exists papers_published_idx on papers (published_at desc);
create index if not exists brief_items_arxiv_idx on brief_items (arxiv_id);
create index if not exists runs_started_idx on runs (started_at desc);
