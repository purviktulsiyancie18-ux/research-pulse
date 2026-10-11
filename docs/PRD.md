# Research Pulse — Product Requirements Document (PRD)

**Version:** 1.0 · **Date:** 11 Oct 2026 · **Owner:** Purvik Tulsiyan (MESA Cohort C4, AI and its Applications — Section 1 Final)
**Audience:** Claude Code (builder). Read this whole document before writing code. Build in the milestone order in §22.

---

## 0. Instructions for the builder (read first)

1. **All AI tasks must use Google Gemini Flash** via a Google AI Studio API key. **Do not use the Claude / Anthropic API anywhere** — this is an exam rule.
2. **Deploy on Vercel (Hobby, free plan).** Every service used must stay on a free tier.
3. **Email goes through Resend only.** No Telegram, Slack, WhatsApp or other channels.
4. **Database is Neon (serverless Postgres).** Do not use Supabase, Vercel KV or Firebase.
5. **The system must work on live data at submission time.** No hard-coded sample papers in production. Mock data is allowed only behind an explicit test flag (§17).
6. Keep every secret in environment variables (§19). Never commit keys. Add `.env.example`.
7. Prefer simple, readable code. TypeScript strict mode. No paid libraries or services.
8. When something in this PRD is ambiguous, choose the simplest option that satisfies the acceptance criteria (§21) and note it in the README.

---

## 1. Context

### 1.1 The exam brief
> Build and deploy an AI-powered weekly research monitoring system that delivers this brief for Kavita every Monday morning.

Submission requires: **a working public Vercel URL, the GitHub repository link, and the Components Map.**

### 1.2 The user — Kavita
Kavita is a senior consultant in the technology advisory practice of a mid-sized management consulting firm. Clients pay her to advise on AI strategy: which architectures to bet on, which use cases have real research backing, where the field is moving. Her credibility depends on being current on **primary research**, not press coverage.

She monitors **8–10 technical domains**, for example:
- AI agents
- Retrieval-augmented generation (RAG)
- LLMs for code
- Computer vision for industrial applications

### 1.3 How she works today (the pain)
- Every morning she searches paper repositories by keyword, skims titles and abstracts, opens promising papers, and decides whether to read in full or flag for a client.
- **45 minutes** on a quiet week; **up to 2 hours** when something significant drops.
- She **still misses things**, especially in domains she checked less carefully.
- She keeps a running document of notable papers, but it is **always incomplete** because she cannot read, summarise and log everything.

### 1.4 What she wants
A **weekly research brief** that behaves like a good research assistant:
- Scans all her monitored domains.
- Surfaces the papers that **seem significant this week**.
- Gives enough context per paper to decide **read it / bring it to a client / ignore**.
- **Organised by domain.**
- **Delivered every Monday morning.**
- **Readable in under 10 minutes.**
- **Domain list adjustable without touching code** (her focus shifts with client mandates).
- If something important was published this week, she knows **by Monday**.

---

## 2. Problem statement → requirement mapping

| Line in brief | Requirement it creates | Where handled |
|---|---|---|
| "Current on research, not press coverage" | Use primary sources: arXiv + scholarly metadata | §9 |
| "Monitors 8–10 domains" | Multi-domain config, each with its own query | §8.1, §12 |
| "Searches, skims, opens, decides" | Automate fetch → filter → summarise → judge | §6, §10 |
| "Misses things in domains she checked less carefully" | Every active domain scanned every run, equal coverage | §8.2 |
| "Running document… always incomplete" | Persistent archive of briefs + papers + her notes | §8.6, §12 |
| "Surfaces papers that seem significant" | Ranking with significance signals (new papers have no citations) | §11 |
| "Enough context to decide read / bring to client" | Per-paper summary, why it matters, client angle, verdict | §10.3 |
| "Organised by domain, Monday, < 10 minutes" | Scheduled cron, grouped layout, reading-time cap | §8.4, §8.5 |
| "Adjustable without touching code" | Settings UI backed by database | §8.1 |
| "Know by Monday, not three months later" | Date-window filter, reliable schedule, Refresh on demand | §8.2, §8.3 |

---

## 3. Goals, non-goals, success metrics

### 3.1 Goals
- G1. Automatic weekly brief every Monday before 7:00 AM IST, by email and on a web page.
- G2. On-demand **Refresh** with flexible windows (since last brief, last 7 days, custom range, one domain).
- G3. Domain list and brief preferences editable in the UI, stored in Neon.
- G4. Ranking that explains **why** each paper was surfaced.
- G5. Archive of all past briefs, searchable, with Kavita's feedback and notes.
- G6. Runs entirely on free tiers and survives API failures gracefully.

### 3.2 Non-goals (v1)
- Sending anything to Kavita's clients. The brief goes to Kavita only.
- Reading full PDFs. v1 works from titles, abstracts and metadata.
- Multi-user accounts, teams, roles.
- Channels other than email (Resend).
- Journals outside arXiv (OpenAlex is "extend later").

### 3.3 Success metrics
| Metric | Target |
|---|---|
| Brief reading time | ≤ 10 minutes (estimated at 200 words/min) |
| Coverage | 100% of active domains processed each run (or explicitly marked failed) |
| Delivery | Weekly email arrives Monday 5:30–6:29 AM IST |
| Run time | Full run for 10 domains < 4 minutes (Vercel limit is 5) |
| Duplicates | 0 papers repeated across delivered briefs |
| Cost | ₹0 / $0 per month |

---

## 4. Constraints

| Constraint | Detail |
|---|---|
| AI | Gemini Flash only (Google AI Studio free key). Model name configurable via `GEMINI_MODEL` — use the newest **Flash** model listed in AI Studio (e.g. `gemini-2.5-flash` or a newer `gemini-*-flash`). |
| Hosting | Vercel Hobby: functions max **300 s**; cron max **once per day** and fires anywhere within the scheduled hour (±59 min); non-commercial use only. |
| arXiv API | Max 1 request every 3 seconds, single connection. |
| Semantic Scholar | Works without a key (shared, rate-limited, may return 429). Free key optional. |
| Gemini free tier | Per-minute and per-day request caps (check AI Studio → Rate limits). Must batch, cache and retry. |
| Resend free | Without a verified domain, sender must be `onboarding@resend.dev` and recipient must be the Resend account's own email. Daily send cap applies. |
| Neon free | Compute scales to zero when idle; first query after idle may be slower. |

---

## 5. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, latest stable), TypeScript, React Server Components |
| Styling | Tailwind CSS |
| Database | Neon Postgres via `@neondatabase/serverless` (raw SQL with tagged templates; or Drizzle ORM if preferred — keep migrations in repo) |
| AI | `@google/genai` (official Google Gen AI SDK) with JSON output + response schema |
| XML parsing (arXiv Atom) | `fast-xml-parser` |
| Validation | `zod` (validate Gemini JSON and API inputs) |
| Email | `resend` SDK; HTML email built as a template string or `@react-email/components` |
| Scheduling | Vercel Cron (`vercel.json`) |
| Background continuation | `after()` from `next/server` so manual runs return a run ID immediately and continue processing |
| Tests | Vitest |

---

## 6. Components Map

The visual map is in **`docs/Research_Pulse_Components_Map.png`** (copy it into the repo). Text version below.

**Columns:** Trigger → Input → Context → Processing → Output
**Rows (actors / tools):** Kavita · Vercel Cron · Research Pulse App · Neon · arXiv API · Semantic Scholar + Hugging Face · Gemini Flash · Resend

| # | Row | Column | Step |
|---|---|---|---|
| 0 | Kavita | Input | Edits domain list in Settings: keywords, arXiv categories, exclude words, papers per domain, email. No code. → saved to Neon |
| 1a | Vercel Cron | Trigger | Fires every Monday, `0 0 * * 1` (lands 5:30–6:29 AM IST). Protected by `CRON_SECRET`. |
| 1b | Kavita | Trigger | Clicks **Refresh now**: since last brief · last 7 days · custom range · one domain |
| 2 | App | Input | Builds the run: weekly or manual, date window, active domains. 10-min cooldown on manual refresh. |
| 3 | Neon | Context | Loads settings: domains, keywords, IDs of papers already sent, past feedback |
| 4 | arXiv API | Context | Fetches new papers per domain by category + keywords, newest first. 1 request / 3 s. |
| 5 | Semantic Scholar + Hugging Face | Context | Adds signals per paper: author h-index, affiliations, TLDR, community upvotes, code link |
| 6 | App | Processing | Cleans: removes duplicates across domains, skips papers already sent, keeps only papers in the date window |
| 7 | Gemini Flash | Processing | Pass 1 on titles + abstracts: relevance to the domain 0–10 → keeps top 10 per domain |
| 8 | Gemini Flash | Processing | Pass 2 on shortlist → JSON: 2-line summary, key finding, why it matters, client angle, verdict READ / CLIENT / FYI |
| 9 | App | Processing | Ranks & composes: Gemini score + upvotes + h-index + code → top 3–5 per domain above threshold. If Gemini fails, still sends titles + abstracts. |
| 10 | Neon | Output | Saves brief, papers, scores, run log. Feedback tunes the next run's ranking. |
| 11 | App | Output | Brief page grouped by domain: summary, why it matters, paper links · archive · run history · PDF export |
| 12 | Resend | Output | Emails the brief by domain + link to the app. Monday: automatic. Refresh: preview first, send on click. |
| 13 | Kavita | Output (**Human decision gate**) | Reads brief in under 10 min; marks each paper Read in full · Bring to client · Not useful → feedback loop to Neon (step 10) |

**Principles shown on the map**
- *Kavita at the edges:* she sets the domains and decides what to read or bring to a client. AI only filters, summarises and ranks in the middle.
- *Guardrails:* only papers from the date window; no paper sent twice; every ranking shows why; Gemini outage still sends titles + abstracts; nothing goes to clients.

---

## 7. User flows

### 7.1 Weekly automatic brief (primary)
1. Vercel Cron calls `GET /api/cron/weekly-brief` with header `Authorization: Bearer <CRON_SECRET>`.
2. Route verifies the secret (401 otherwise). If `settings.delivery_paused = true`, log a skipped run and exit.
3. Create run (`trigger='cron'`, `mode='since_last_brief'`). Window = from the end of the last **delivered** brief to now (fallback: last 7 days). This means a paused week is automatically covered on the next run.
4. Execute pipeline (§10) for all active domains.
5. Save brief, send email via Resend, mark brief `delivered`, set `emailed_at`.
6. Kavita opens the email, clicks through to the brief page, gives feedback.

### 7.2 Manual Refresh
1. On the home page, Kavita opens the **Refresh** panel and picks:
   - Mode: **Since last brief** (default) · **Last 7 days** · **Custom range** (from/to dates, max 31 days) · and optionally **one or more domains** (default all active).
   - Checkbox "Email this brief when ready" (default **off** → preview only).
2. `POST /api/runs` checks the cooldown (default 10 min since last manual run; disabled when `TEST_MODE=true`). If blocked, return 429 with seconds remaining; UI shows a countdown.
3. API creates the run and returns `{ runId }` immediately; pipeline continues via `after()`.
4. UI polls `GET /api/runs/{id}` every 3 s, showing progress per domain (`fetching`, `enriching`, `ranking`, `done`, `failed`).
5. When done, UI shows the brief as a **preview** with a **Send email** button (`POST /api/briefs/{id}/send`).
6. Preview briefs are **not** counted as "delivered" (their papers can appear in the next Monday brief) unless emailed or the user clicks **Mark as delivered**.

### 7.3 Editing domains / settings
1. `/settings` lists domains with toggle (active/paused), priority, edit, delete.
2. Add/edit form: name, description (1 line, sent to Gemini as context), keywords (chips), arXiv categories (multi-select from a fixed list), exclude keywords, priority (High/Normal/Low), papers-per-domain override.
3. Global settings form (§8.1.2). Saved to Neon. Changes take effect on the next run.
4. **Preview query** button on a domain: runs only the arXiv fetch (no Gemini) and shows how many papers matched the last 7 days, so she can tune keywords.

### 7.4 Feedback and notes
1. On every paper card: buttons **Read in full**, **Bring to client**, **Not useful**, and a ☆ star; optional note text and client tag.
2. Saved via `POST /api/feedback`.
3. Next runs use recent feedback as examples in the Gemini Pass 2 prompt (§10.3) and starred papers appear in the **Library** page.

### 7.5 Reading the archive
- `/briefs` lists past briefs (date, window, # papers, delivered/preview).
- Search box across title, summary, notes. Filter by domain and verdict.
- `/library` shows starred / "bring to client" papers with notes — this replaces her incomplete running document.

---

## 8. Functional requirements

### 8.1 Settings and flexibilities (no code changes needed)

#### 8.1.1 Per-domain settings
| Field | Type | Default | Notes |
|---|---|---|---|
| name | text | — | e.g. "RAG" |
| description | text | — | One line describing what counts as relevant; fed to Gemini |
| keywords | text[] | — | Phrases searched in title/abstract (OR) |
| categories | text[] | — | arXiv categories (AND with keywords group) |
| exclude_keywords | text[] | [] | Drop paper if title/abstract contains any |
| priority | enum high/normal/low | normal | High domains appear first and get +1 slot; low get −1 (min 1) |
| papers_per_domain | int nullable | null → global | Override |
| active | bool | true | Paused domains are skipped |

#### 8.1.2 Global settings (single row)
| Setting | Default | Purpose |
|---|---|---|
| recipient_email | (env `DEFAULT_RECIPIENT`) | Where the brief goes |
| papers_per_domain | 4 | Range 1–8 |
| significance_threshold | 5.0 | Final score 0–10 required to appear |
| ranking_style | `balanced` | `breakthroughs` / `balanced` / `broad` (§11.3) |
| reading_minutes | 10 | Hard cap for brief length (5 or 10 offered in UI) |
| lookback_days | 7 | Window used for "Last N days" mode and first run |
| detail_level | `standard` | `short` (one-line summary) / `standard` / `detailed` (adds method + limitations) |
| client_lens | null | Optional industry (e.g. "manufacturing", "banking"); rewrites client angle |
| watchlist_authors | [] | Names that boost score |
| watchlist_orgs | [] | Labs/orgs (e.g. "Google DeepMind", "Meta FAIR") that boost score |
| watchlist_terms | [] | Benchmarks/terms (e.g. "SWE-bench") that boost score |
| sources | `{arxiv:true, semantic_scholar:true, huggingface:true}` | Toggle signal sources (arXiv cannot be off) |
| delivery_paused | false | Pause Monday email (vacation) |
| refresh_cooldown_minutes | 10 | Manual refresh cooldown |
| email_manual_refresh_default | false | Default for "email this brief" checkbox |

#### 8.1.3 Schedule note
Vercel Hobby cron cannot be edited at runtime. The schedule is fixed in `vercel.json` as `0 0 * * 1` (Monday 00:00 UTC → arrives 5:30–6:29 AM IST). Settings page shows this as read-only text with the "Pause delivery" toggle. Document in README how to change it.

### 8.2 Run engine
- A run has: trigger (`cron`/`manual`), mode (`since_last_brief`/`last_n_days`/`custom`), window_start, window_end, domain IDs, status (`queued`/`running`/`succeeded`/`partial`/`failed`/`skipped`), per-domain progress, stats, error.
- Every active selected domain is processed. One domain failing never fails the run; status becomes `partial` and the brief shows a notice for that domain.
- **Time guard:** if elapsed > 240 s, stop starting new work, finalise with what is done, status `partial`.
- Only one run executes at a time: if a run is `running` and started < 6 min ago, a new request returns 409 with the existing run ID.
- **Retry failed domain:** `POST /api/runs/{id}/retry-domain` re-runs one domain and merges into the same brief.

### 8.3 Refresh flexibilities
- Since last brief / last N days / custom range / selected domains (§7.2).
- Preview first, send on click.
- Cooldown with visible countdown.
- "Last updated" timestamp on the brief page.

### 8.4 Brief composition
- Grouped by domain, ordered by priority then by the domain's top score.
- Top of brief: **Headline of the week** (2–3 sentences) + a stats line ("312 papers scanned across 6 domains · 18 surfaced").
- Per domain: 1-line domain headline, then 1–N paper cards. If nothing passes the threshold: "Quiet week — nothing above your threshold" plus the single best candidate collapsed under "Closest miss".
- Per paper card: title (link to arXiv abs page), authors (first 3 + "et al."), affiliations if known, date, verdict badge (READ / CLIENT / FYI), final score, **2-line summary**, **key finding**, **why it matters**, **client angle**, **why ranked** chips (e.g. "Top-lab authors", "42 upvotes", "Code released", "Watch-list: SWE-bench"), links: arXiv, PDF, code (if any). Feedback buttons in the app only.
- **Reading-time cap:** estimate words (headline + cards) / 200 wpm. If over `reading_minutes`, drop lowest-scoring cards from lowest-priority domains first, never below 1 card per domain that has a qualifying paper.

### 8.5 Email (Resend)
- Subject: `Research Pulse · Week of 12 Oct 2026 · 18 papers across 6 domains`.
- From: `Research Pulse <onboarding@resend.dev>` unless `EMAIL_FROM` is set.
- HTML with inline styles (email-client safe), max width 640 px, grouped by domain, same card fields except feedback buttons; footer with "Open in Research Pulse" link (`APP_URL/briefs/{id}`) and "Manage domains" link.
- Plain-text alternative included.
- Store Resend message ID on the brief. Idempotent: if `emailed_at` is set, `send` returns 200 without sending again unless `?force=1`.

### 8.6 Archive, library, history
- `/briefs` archive with search + filters.
- `/library` starred and "bring to client" papers with notes and client tags.
- `/runs` run history: trigger, mode, window, status, duration, papers scanned/kept, Gemini calls, errors; retry button for failed domains.
- **Trends strip** on home: papers scanned per domain this week vs last week (simple bar list, no chart library required).

### 8.7 Export
- **PDF:** "Export PDF" button uses a print stylesheet + `window.print()` (free, no server rendering).
- **Markdown:** "Copy as Markdown" button copies the brief as Markdown to clipboard.

### 8.8 Access control (lightweight)
- Optional `ADMIN_PASSCODE` env var. If set, Settings, Refresh, Send and Feedback require the passcode (entered once, stored as an httpOnly signed cookie for 30 days). Reading briefs stays public so examiners can view the URL. If unset, everything is open (document this).

---

## 9. Data sources and API details

### 9.1 arXiv API (primary source, no key)
- Endpoint: `https://export.arxiv.org/api/query`
- Params: `search_query`, `start=0`, `max_results=100`, `sortBy=submittedDate`, `sortOrder=descending`.
- Query builder per domain:
  ```
  (cat:cs.CL OR cat:cs.IR) AND (abs:"retrieval augmented" OR ti:"retrieval augmented" OR abs:RAG OR ti:RAG)
  AND submittedDate:[202610040000 TO 202610112359]
  ```
  - Multi-word keywords are quoted. URL-encode the whole query.
  - If date-range filtering in the query returns an error or zero results unexpectedly, fall back to sorting by date and filtering by `published` client-side.
- If 100 results are returned and the oldest is still inside the window, page once more (`start=100`), max 200 papers per domain.
- Response is Atom XML. Extract: arXiv ID (strip version, keep `2410.12345`), title, summary (abstract), authors, `published`, `updated`, categories, abs URL, PDF URL, comments (may contain "code available at …").
- **Rate limit:** wait ≥ 3.1 s between requests; one request at a time. Set a `User-Agent` like `ResearchPulse/1.0 (mailto:<recipient>)`.
- Apply `exclude_keywords` client-side.

### 9.2 Semantic Scholar Graph API (signals; key optional)
- Endpoint: `POST https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,tldr,venue,citationCount,influentialCitationCount,externalIds,authors.name,authors.hIndex,authors.affiliations`
- Body: `{ "ids": ["ARXIV:2410.12345", ...] }` (up to 500 IDs per call; send one batch per run after dedupe).
- Header `x-api-key: <S2_API_KEY>` only if set.
- Response entries may be `null` (paper not indexed yet) and fields may be missing — handle gracefully.
- On 429: wait 2 s, retry up to 3 times with backoff; then continue without S2 signals and note it in run stats.
- Store: `max_author_hindex`, author affiliations (unique list), `tldr.text`, venue.

### 9.3 Hugging Face Daily Papers (community signal, no key)
- Endpoint: `GET https://huggingface.co/api/daily_papers?date=YYYY-MM-DD` for each date in the window (max 14 calls; run in parallel, limit 4 concurrent).
- Map `paper.id` (arXiv ID) → `paper.upvotes`; also capture GitHub repo URL if present in the response.
- If the endpoint shape differs or fails, log and continue with upvotes = 0. Treat this source as best-effort.

### 9.4 Google Gemini (AI)
- SDK: `@google/genai`; `GEMINI_API_KEY`; model from `GEMINI_MODEL`.
- Always request JSON: `responseMimeType: "application/json"` + `responseSchema`; validate with zod; one repair retry if invalid.
- `temperature: 0.2`.
- Retry on 429/5xx: exponential backoff (2 s, 5 s, 10 s), max 3 attempts. Concurrency limit 2 calls at a time.
- **Cache:** results are stored in `paper_analysis` keyed by `(arxiv_id, domain_id, prompt_version)`; reruns reuse cached analysis and do not call Gemini for that paper again.

### 9.5 Resend (email)
- SDK `resend`; `RESEND_API_KEY`; `EMAIL_FROM` default `Research Pulse <onboarding@resend.dev>`.

### 9.6 Neon (database)
- `DATABASE_URL` (pooled connection string). Use `@neondatabase/serverless`.

---

## 10. Pipeline — detailed working

```
run(trigger, mode, window, domainIds)
 ├─ 1. load settings, domains, delivered paper IDs, recent feedback          [Neon]
 ├─ 2. for each domain (sequential, 3.1 s gap):  fetch arXiv                  [arXiv]
 ├─ 3. clean: window filter, exclude words, dedupe across domains,
 │           drop already-delivered papers, upsert into papers table
 ├─ 4. enrich all remaining papers in one S2 batch + HF daily lists           [S2, HF]
 ├─ 5. per domain: Gemini Pass 1 (relevance)                                  [Gemini]
 ├─ 6. per domain: Gemini Pass 2 (analysis) on top 10                         [Gemini]
 ├─ 7. compute final scores, apply threshold + per-domain caps + reading cap
 ├─ 8. Gemini headline-of-the-week (1 call, optional)                         [Gemini]
 ├─ 9. save brief + items; update run stats                                   [Neon]
 └─ 10. if cron or sendEmail: send via Resend, mark delivered                 [Resend]
```

### 10.1 Cleaning rules
- Keep papers whose `published` date is inside `[window_start, window_end]`.
- Same paper matched by two domains → keep it in **both** domains' candidate lists for analysis, but in the final brief show it **once**, under the domain where its final score is highest, with a "Also relevant to: X" note.
- Drop papers already in any **delivered** brief.
- Drop papers containing any exclude keyword (case-insensitive) in title or abstract.

### 10.2 Gemini Pass 1 — relevance triage
- One call per domain, up to 40 candidates per call (split into batches if more). Abstracts truncated to 1,200 characters.
- **Prompt (system):**
  > You are a research assistant for a senior AI-strategy consultant. You triage new arXiv papers for one research domain. Judge only relevance to the domain as described, not quality. Return JSON only.
- **Prompt (user):**
  > Domain: {name}
  > What counts as relevant: {description}
  > Keywords: {keywords}
  > Papers: [{ "id", "title", "abstract" }, ...]
  > For each paper return relevance 0–10 (10 = squarely about this domain; 0 = unrelated) and a reason of at most 15 words.
- **Schema:** `{ "results": [ { "id": string, "relevance": number, "reason": string } ] }`
- Keep papers with relevance ≥ 6, sort desc, take top 10 (ties broken by HF upvotes).
- If the call fails after retries: fall back to keyword-match count as relevance and continue.

### 10.3 Gemini Pass 2 — analysis
- One call per domain with the ≤ 10 shortlisted papers. Include per paper: title, abstract, authors, affiliations, venue, S2 TLDR, HF upvotes, code link, max author h-index.
- Include up to 6 recent feedback examples for the domain: titles marked `client`/`read` ("useful") and `not_useful`.
- Include `client_lens` and `detail_level` instructions.
- **Prompt (system):**
  > You are a rigorous research analyst briefing a management consultant who advises clients on AI strategy. Be concrete and factual; use only information in the provided abstract and metadata; never invent results or numbers. If a claim is not in the abstract, do not state it. Return JSON only.
- **Prompt (user):**
  > Domain: {name} — {description}
  > Client lens: {client_lens or "general enterprise"}
  > Detail level: {short|standard|detailed}
  > Kavita found these useful before: {titles}. Not useful: {titles}.
  > Papers: [...]
  > For each paper produce: summary (≤ 2 sentences, ≤ 40 words), key_finding (1 sentence, include the metric/benchmark if stated), why_it_matters (1 sentence for a strategy consultant), client_angle (1 sentence on the business implication), verdict (READ = worth reading in full, CLIENT = worth bringing to a client, FYI = good to know), significance 0–10 (novelty, strength of evidence, new benchmark/SOTA, reframes the problem, likely impact), significance_reasons (1–3 short phrases). If detail level is "detailed", also produce method (1 sentence) and limitations (1 sentence). Also produce domain_headline: one sentence summarising this week in the domain.
- **Schema:**
  ```json
  {
    "domain_headline": "string",
    "papers": [{
      "id": "string",
      "summary": "string",
      "key_finding": "string",
      "why_it_matters": "string",
      "client_angle": "string",
      "verdict": "READ|CLIENT|FYI",
      "significance": 0,
      "significance_reasons": ["string"],
      "method": "string (optional)",
      "limitations": "string (optional)"
    }]
  }
  ```
- Validate every `id` exists in the input; discard unknown IDs.

### 10.4 Headline of the week (optional call)
- Input: domain headlines + top paper titles. Output: `{ "headline": "2–3 sentences" }`. On failure, omit the headline.

### 10.5 Fallback when Gemini is unavailable
- If Pass 2 fails for a domain, still include up to N papers ranked by signals only (§11.2 without the Gemini terms), showing the first two sentences of the abstract as the summary and S2 TLDR if available. Card shows a small "AI summary unavailable" tag. Brief header shows a notice. Email is still sent.

---

## 11. Ranking

### 11.1 Signals (each normalised to 0–10)
| Signal | Formula |
|---|---|
| `sig` Gemini significance | as returned (0–10) |
| `rel` Pass 1 relevance | as returned (0–10) |
| `community` HF upvotes | `min(10, 2 * log2(1 + upvotes))` |
| `author` max author h-index | `min(10, hIndex / 8)` |
| `code` code released | 10 if code URL found (HF, S2 or "github.com" in arXiv comments) else 0 |
| `watch` watch-list | +1.5 if any watch-list author/org/term matches (authors, affiliations, title, abstract); max +1.5 |

### 11.2 Final score
```
final = w_sig*sig + w_rel*rel + w_comm*community + w_auth*author + w_code*code + watch
final = clamp(final, 0, 10)
```
| Style | w_sig | w_rel | w_comm | w_auth | w_code | threshold delta | papers/domain |
|---|---|---|---|---|---|---|---|
| breakthroughs | 0.65 | 0.10 | 0.12 | 0.08 | 0.05 | +1.5 | min(setting, 3) |
| balanced (default) | 0.55 | 0.15 | 0.15 | 0.10 | 0.05 | 0 | setting |
| broad | 0.45 | 0.25 | 0.15 | 0.10 | 0.05 | −1.0 | setting + 2 |

Without Gemini (fallback): `final = 0.5*rel_kw + 0.25*community + 0.15*author + 0.10*code + watch`, where `rel_kw` = 10 × (keyword hits / max hits in domain).

### 11.3 Explanation
Store `score_breakdown` JSON per item (each weighted component + reasons) and render "why ranked" chips from it: Gemini reasons, "Top-lab authors (h-index 45)", "38 upvotes", "Code released", "Watch-list: SWE-bench".

### 11.4 Feedback learning (simple, transparent)
- Feedback examples are injected into Pass 2 (§10.3).
- Authors appearing in ≥ 2 papers marked `client` or `read` get an automatic +0.5 boost (shown as chip "You found this author useful"). Papers marked `not_useful` are never shown again.

---

## 12. Data model (Neon Postgres)

```sql
create table domains (
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

create table settings (
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

create table runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null check (trigger in ('cron','manual')),
  mode text not null check (mode in ('since_last_brief','last_n_days','custom')),
  window_start timestamptz not null,
  window_end timestamptz not null,
  domain_ids int[] not null,
  status text not null default 'queued',
  progress jsonb not null default '{}',      -- { "<domainId>": "fetching|enriching|ranking|done|failed" }
  stats jsonb not null default '{}',         -- scanned, kept, gemini_calls, s2_ok, hf_ok, duration_ms ...
  error text,
  brief_id uuid,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table papers (
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

create table paper_analysis (
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

create table briefs (
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

create table brief_items (
  id serial primary key,
  brief_id uuid references briefs(id) on delete cascade,
  domain_id int references domains(id),
  arxiv_id text references papers(arxiv_id),
  rank int not null,
  final_score numeric not null,
  score_breakdown jsonb not null,
  also_relevant_to int[] not null default '{}',
  ai_available boolean not null default true,
  unique (brief_id, arxiv_id)
);

create table feedback (
  id serial primary key,
  arxiv_id text references papers(arxiv_id),
  domain_id int references domains(id),
  brief_id uuid references briefs(id),
  verdict text check (verdict in ('read','client','not_useful')),
  starred boolean not null default false,
  note text,
  client_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (arxiv_id, domain_id)
);

create index on papers (published_at desc);
create index on brief_items (arxiv_id);
create index on runs (started_at desc);
```
- Provide `scripts/migrate.ts` (applies `db/schema.sql`) and `scripts/seed.ts` (inserts settings row and the seed domains in §13). Add npm scripts `db:migrate`, `db:seed`.
- "Delivered paper IDs" = `select arxiv_id from brief_items join briefs on … where briefs.status='delivered'`.

---

## 13. Seed data (default domains)

| Name | Description | Categories | Keywords | Exclude |
|---|---|---|---|---|
| AI Agents | LLM-based agents that plan, use tools, act autonomously or collaborate | cs.AI, cs.CL, cs.MA, cs.LG | "LLM agent", "agentic", "tool use", "multi-agent", "autonomous agent", "computer use" | — |
| Retrieval-Augmented Generation | Systems that ground LLM outputs in retrieved documents | cs.CL, cs.IR, cs.AI | "retrieval-augmented", "retrieval augmented", "RAG", "GraphRAG", "dense retrieval" | — |
| LLMs for Code | LLMs that write, repair, review or reason about code | cs.SE, cs.CL, cs.LG, cs.PL | "code generation", "program synthesis", "code LLM", "SWE-bench", "program repair" | — |
| Industrial Computer Vision | Vision for manufacturing, inspection, robotics, industrial QA | cs.CV, cs.RO | "defect detection", "industrial inspection", "anomaly detection", "manufacturing", "visual inspection" | "medical", "clinical" |

Settings seed: `recipient_email = DEFAULT_RECIPIENT`, others default. Watch-list orgs seed: "Google DeepMind", "OpenAI", "Meta", "Microsoft Research", "Anthropic", "Stanford", "MIT", "Carnegie Mellon". (Watch-list only boosts; it never sends data anywhere.)

---

## 14. API routes

| Method & path | Purpose | Auth |
|---|---|---|
| `GET /api/cron/weekly-brief` | Cron entry; verifies `Authorization: Bearer CRON_SECRET`; runs weekly brief; `export const maxDuration = 300` | Cron secret |
| `POST /api/runs` | Start manual run `{ mode, from?, to?, domainIds?, sendEmail? }` → `{ runId }`; 429 cooldown, 409 already running | Passcode |
| `GET /api/runs/:id` | Run status + progress + briefId | Public |
| `POST /api/runs/:id/retry-domain` | `{ domainId }` re-run one domain | Passcode |
| `GET /api/briefs/:id` | Brief JSON | Public |
| `POST /api/briefs/:id/send` | Email brief via Resend (idempotent; `?force=1`) | Passcode |
| `POST /api/briefs/:id/deliver` | Mark preview as delivered without emailing | Passcode |
| `GET/POST /api/domains`, `PATCH/DELETE /api/domains/:id` | Domain CRUD (zod validated) | Passcode for writes |
| `POST /api/domains/:id/preview` | arXiv-only test of a domain query (count + 5 titles) | Passcode |
| `GET/PATCH /api/settings` | Global settings | Passcode for writes |
| `POST /api/feedback` | Upsert feedback `{ arxivId, domainId, briefId, verdict?, starred?, note?, clientTag? }` | Passcode |
| `POST /api/auth/passcode` | Exchange passcode for cookie | — |
| `GET /api/health` | Checks DB, env vars present (not values), Gemini model name | Public |

All write routes validate input with zod and return `{ error }` with proper status codes.

---

## 15. Pages and UI

| Route | Content |
|---|---|
| `/` | Latest brief (preview or delivered) + Refresh panel + "Last updated" + trends strip + notices |
| `/briefs` | Archive list, search, filters |
| `/briefs/[id]` | Full brief: headline, stats line, domain sections, paper cards, feedback buttons, Export PDF, Copy Markdown, Send email (if preview) |
| `/library` | Starred and "Bring to client" papers with notes and client tags |
| `/settings` | Domains table + add/edit modal + preview query; global settings form; schedule info; pause toggle |
| `/runs` | Run history table, expandable per-domain status, retry button |

**Design notes:** clean, readable, mobile-friendly (she reads on phone on Monday morning). Max content width ~760 px for the brief. Verdict badges: READ (blue), CLIENT (green), FYI (grey). Show skeleton loaders while polling. Empty state on first deploy: "No briefs yet — click Refresh to generate your first brief."

---

## 16. Error handling, limits and fallbacks

| Failure | Behaviour |
|---|---|
| arXiv error/timeout for a domain | Retry once after 5 s; then mark domain failed, continue others, notice in brief |
| arXiv returns 0 papers | Domain shows "Quiet week"; not an error |
| Semantic Scholar 429/error | Backoff ×3, then continue without S2 signals (weights redistributed proportionally) |
| Hugging Face error | Continue with upvotes = 0 |
| Gemini 429/5xx | Backoff ×3; Pass 1 fallback = keyword relevance; Pass 2 fallback = §10.5 |
| Gemini invalid JSON | One repair retry ("Return valid JSON matching the schema"); then fallback |
| Approaching 300 s | Time guard at 240 s → finalise partial brief |
| Resend error | Brief saved as preview with notice "Email failed: …"; Send button available to retry |
| Neon cold start | Use pooled URL; first query timeout 10 s with one retry |
| Concurrent runs | 409 with existing runId |
| Manual refresh spam | Cooldown 429 with retry-after seconds |

Log each external call (service, status, ms) into `runs.stats` counters; never log secrets or full abstracts.

---

## 17. Testing mode and tests

### 17.1 Flags
- `TEST_MODE=true`: disables cooldown, adds "TEST" badge in UI, emails only to `DEFAULT_RECIPIENT`.
- `MOCK_GEMINI=true`: Gemini calls return deterministic fixture JSON from `fixtures/` (for UI work without spending quota). **Must be false in production.**
- Manual refresh **defaults to preview** (no email) to save Resend quota.
- Encourage testing with 1–2 domains active; caching avoids repeated Gemini calls for the same papers.

### 17.2 Automated tests (Vitest)
- arXiv query builder (quoting, categories, date range encoding).
- Atom XML parser (fixture file).
- Window calculation for each mode (incl. "since last brief" with no prior brief, and paused weeks).
- Dedupe + "also relevant to" assignment.
- Score normalisation and final score for each ranking style; threshold and caps; reading-time trimming.
- Zod validation of Gemini responses (valid, missing fields, unknown IDs).
- Cron route rejects missing/wrong secret.

---

## 18. Security and privacy
- `CRON_SECRET` check on the cron route.
- Optional `ADMIN_PASSCODE` (§8.8); signed cookie using `SESSION_SECRET`.
- All secrets in Vercel env vars; `.env.local` in `.gitignore`; `.env.example` with placeholders only.
- No personal data beyond recipient email. Only paper titles/abstracts/metadata are sent to Gemini.
- Escape all paper text in HTML (React does this; for the email template, escape manually).

---

## 19. Environment variables and how to get each key

| Variable | Required | How to get it |
|---|---|---|
| `DATABASE_URL` | Yes | **Neon:** console.neon.tech → your project → Dashboard → **Connect** → choose the **pooled** connection string → copy. (Or add Neon from Vercel → Storage, which sets it automatically.) |
| `GEMINI_API_KEY` | Yes | **Google AI Studio:** aistudio.google.com → **Get API key** → Create API key → copy. |
| `GEMINI_MODEL` | Yes | Newest Flash model name shown in AI Studio (e.g. `gemini-2.5-flash`). |
| `RESEND_API_KEY` | Yes | **Resend:** resend.com → **API Keys** → Create API key (Sending access) → copy. |
| `EMAIL_FROM` | No | Default `Research Pulse <onboarding@resend.dev>`. Only change after verifying a domain in Resend. |
| `DEFAULT_RECIPIENT` | Yes | The email you signed up to Resend with (required while using `onboarding@resend.dev`). |
| `CRON_SECRET` | Yes | Generate locally: `openssl rand -hex 32` (or any long random string). |
| `APP_URL` | Yes | Your production URL, e.g. `https://research-pulse.vercel.app` (no trailing slash). |
| `S2_API_KEY` | No | **Semantic Scholar:** semanticscholar.org/product/api → **Request API key** form (free; approval can take days). App works without it. |
| `ADMIN_PASSCODE` | No | Any passcode you choose; share it with the examiner if set. |
| `SESSION_SECRET` | If passcode set | `openssl rand -hex 32` |
| `TEST_MODE` | No | `false` in production |
| `MOCK_GEMINI` | No | `false` in production |

arXiv and Hugging Face need **no key**. GitHub is used only to host the repo and auto-deploy to Vercel.

---

## 20. Deployment

1. Create GitHub repo `research-pulse` (public, so examiners can view it). Push code.
2. Vercel → **Add New → Project** → import the repo → Framework: Next.js.
3. Add all env vars from §19 for **Production** (and Preview if desired).
4. Deploy. Then run `npm run db:migrate && npm run db:seed` locally against the Neon `DATABASE_URL` (or provide a one-time protected route `POST /api/admin/setup` guarded by `CRON_SECRET`).
5. `vercel.json`:
   ```json
   { "crons": [{ "path": "/api/cron/weekly-brief", "schedule": "0 0 * * 1" }] }
   ```
   Cron runs only on the **production** deployment.
6. In the cron and runs routes: `export const maxDuration = 300;` and `export const dynamic = "force-dynamic";`.
7. Verify: open `/api/health`; click Refresh on `/`; confirm a brief appears; click Send; confirm email arrives. Trigger the cron once manually from Vercel dashboard → Settings → Cron Jobs → **Run**.
8. Commit `docs/Research_Pulse_Components_Map.png` and this PRD as `docs/PRD.md`.

---

## 21. Acceptance criteria

1. Public Vercel URL loads; `/api/health` returns ok.
2. Settings: add, edit, pause, delete a domain from the UI; change persists after reload (stored in Neon). No code change needed.
3. Refresh (since last brief, last 7 days, custom range, single domain) produces a brief from **live arXiv data** within 4 minutes for 4 domains.
4. Brief is grouped by domain, each paper shows summary, key finding, why it matters, client angle, verdict, score and "why ranked" chips, with working arXiv links.
5. Estimated reading time ≤ configured limit (default 10 min) and shown on the brief.
6. Send email delivers the brief to `DEFAULT_RECIPIENT` via Resend; sending twice does not duplicate.
7. Cron route returns 401 without the secret; with the secret it creates a delivered brief and sends the email.
8. A paper delivered in one brief never appears in a later brief.
9. Setting `GEMINI_API_KEY` to an invalid value still yields a brief with titles + abstracts and a visible notice.
10. Feedback buttons save; "Not useful" papers never reappear; starred papers appear in `/library`.
11. Run history shows each run with status, duration, counts; a failed domain can be retried.
12. Manual refresh cooldown works (and is disabled in `TEST_MODE`).
13. Export PDF and Copy Markdown work.
14. No Claude/Anthropic API usage anywhere in the repo; Gemini Flash is the only AI.
15. README explains setup, env vars, how to get keys, how to change schedule, and includes the Components Map image.

---

## 22. Build order (milestones)

1. **M1 – Scaffold & data:** Next.js + Tailwind + TypeScript; Neon client; `db/schema.sql`; migrate + seed scripts; `/api/health`.
2. **M2 – Settings:** domains CRUD + global settings UI and API; passcode middleware.
3. **M3 – Fetch:** arXiv query builder, rate-limited client, Atom parser, cleaning rules, domain preview; unit tests.
4. **M4 – Run engine:** runs table, `POST /api/runs` with `after()`, polling endpoint, progress, time guard, cooldown, single-run lock.
5. **M5 – Signals:** Semantic Scholar batch + Hugging Face daily papers, with fallbacks.
6. **M6 – AI:** Gemini client (JSON schema, zod, retries, concurrency, cache), Pass 1, Pass 2, headline, fallback path; `MOCK_GEMINI` fixtures.
7. **M7 – Ranking & brief:** scoring, styles, threshold, caps, reading-time trim, dedupe assignment, save brief + items.
8. **M8 – UI:** home with Refresh panel, brief page with cards and feedback, archive, library, runs, export PDF/Markdown.
9. **M9 – Email & cron:** Resend template (HTML + text), send/deliver endpoints, cron route with secret, `vercel.json`.
10. **M10 – Hardening & docs:** error paths from §16, tests from §17, README, `.env.example`, deploy, run acceptance checklist §21.

---

## 23. Out of scope (extend later)
- OpenAlex for journals beyond arXiv; GitHub stars as a signal.
- Extra recipients per domain; custom Resend domain.
- "Ask about this paper" Q&A and side-by-side paper comparison.
- Full-PDF reading and figure extraction.
- Runtime-editable cron schedule (needs Vercel Pro or an external scheduler).

---

## 24. Submission checklist
- [ ] Public Vercel URL (production) with at least one live brief generated
- [ ] GitHub repository link (public)
- [ ] Components Map image (`docs/Research_Pulse_Components_Map.png`)
- [ ] README with setup + env vars + screenshots
- [ ] Gemini Flash only; no Claude API
