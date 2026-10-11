# Research Pulse — Design Brief

**Live app (current design):** https://research-pulse-orcin.vercel.app/
**Ask:** Redesign the web app (and the weekly email) so it is calm, scannable and pleasant to read on a phone on a Monday morning. Keep every feature and piece of content listed here; improve hierarchy, layout, typography, spacing and visual polish.

---

## 1. What the product is

Research Pulse is an AI research assistant. Every Monday before 7 AM (India time) it:

1. collects the week's new AI research papers from **arXiv** (a free website where researchers post papers),
2. looks up signals — author seniority from **Semantic Scholar**, community likes ("upvotes") from **Hugging Face**,
3. has **Gemini** (Google's AI) score each paper and write a short summary,
4. picks the best 3–5 papers per topic and emails a **brief** (the weekly report).

The same brief lives on the website, where the user gives feedback on each paper.

**One-line pitch:** "The 10-minute Monday read that keeps an AI consultant current on research — without reading 300 papers."

## 2. Who uses it

**Kavita** — senior consultant at a management-consulting firm, advises clients on AI strategy.

- Not a developer. Smart, busy, non-technical about software.
- Reads the brief **on her phone on Monday morning**, often between meetings. Desktop for deeper work (settings, library).
- Goal per paper: decide in seconds → *read it in full* / *bring it to a client* / *ignore*.
- Her credibility depends on knowing primary research, not press coverage.
- She tracks 4–10 **domains** (research topics), e.g. AI Agents, RAG, LLMs for Code, Industrial Computer Vision. Her focus shifts with client work, so she edits topics herself.

**Secondary:** exam assessors opening the public link — first impression must be clear and credible.

## 3. Design goals (in priority order)

1. **Readable in under 10 minutes** — strong hierarchy so she can skim titles + verdicts, then dip into details.
2. **Mobile-first** — 375 px wide must feel native, not squeezed. Desktop max reading width ≈ 760 px for the brief.
3. **Calm and trustworthy** — editorial / premium-newsletter feel (think Stratechery, The Economist Espresso, Linear changelog), not a dashboard.
4. **Plain language, little jargon** — explanations available but not in the way (current approach: a few ⓘ tooltips + hover titles; the user found brackets and too many ⓘ icons cluttered).
5. **Fast decisions** — feedback buttons easy to hit with a thumb; verdict and score visible at a glance.
6. **Prints well** — "Export PDF" uses the browser print dialog.

**Avoid:** dense tables on mobile, many icons in one line, long bracketed explanations, dashboard chrome, heavy shadows, gradients-for-decoration.

## 4. Information architecture

Top navigation (6 tabs):

| Tab | URL | Purpose |
|---|---|---|
| **Brief** (home) | `/` | Latest brief + Refresh panel + Trends |
| **Archive** | `/briefs` | All past briefs, searchable |
| — brief detail | `/briefs/[id]` | One full brief |
| **Library** | `/library` | Her saved papers (starred / "bring to client") with notes |
| **Runs** | `/runs` | Technical log of each generation run (secondary — can be visually de-emphasised) |
| **Scoring** | `/scoring` | Explains how papers are scored (the rubric) |
| **Settings** | `/settings` | Topics + brief preferences |
| Unlock | `/unlock` | Passcode screen (only if a passcode is enabled) |

Suggestion welcome: Runs and Scoring could move to a secondary menu / footer; Brief, Archive, Library, Settings are primary.

---

## 5. Page-by-page inventory (everything that must exist)

### 5.1 Brief (home `/`) and Brief detail (`/briefs/[id]`)

Desktop: brief on the left (≈760 px), sidebar on the right (≈280 px) with Refresh, Trends, schedule note. Mobile: sidebar content stacks above or collapses (Refresh is important but secondary to reading).

**Brief header**
- Status badge: **PREVIEW** (not sent yet; its papers may appear again next week) or **DELIVERED** (sent; papers never repeat). Hover explains.
- "Last updated 11 Oct, 16:49 IST"
- Title: **"Week of 11 Oct 2026"**
- Meta line: `4 Oct 2026 – 11 Oct 2026 · 299 papers scanned across 4 domains · 13 included · ~6.5 min read`
- Actions: **Export PDF**, **Copy Markdown**, **Send email** (only if not yet emailed), **Mark as delivered** (only if PREVIEW), **Resend email** (only if already emailed, asks to confirm)
- After emailing: a small confirmation chip "✓ Emailed 11 Oct, 17:30"
- Transient message after an action, e.g. "Emailed to …", "Markdown copied"

**Headline of the week** — label + 2–4 sentence AI paragraph summarising all topics. The hero of the page.

**Notices** (0–n, warning style), e.g.
- "AI summary unavailable for some papers (Gemini did not respond) — showing titles and abstracts ranked by signals."
- "Semantic Scholar was unavailable — author signals were skipped this run."
- "Email failed: …"

**Topic jump-links** — pills: `AI Agents (5)` `LLMs for Code (4)` `Retrieval-Augmented Generation (4)` `Industrial Computer Vision (0)`

**Topic section** (repeats per domain, ordered by priority)
- Topic name (e.g. "AI Agents")
- "This week:" one-sentence AI summary of the topic
- 1–6 paper cards
- States: **Quiet week** ("Quiet week — nothing scored above your pass mark.") + optional collapsed **Closest miss** card; **Failed topic** (error notice, e.g. "AI Agents: could not be processed (…). Retry this domain from Run history.")

**Paper card** (most important component — design this carefully)

| Element | Notes |
|---|---|
| Verdict badge | **READ** (read in full) · **CLIENT** (bring to a client) · **FYI** (for your information). Currently blue / green / grey. Or "AI summary unavailable" (amber) when AI failed |
| Score | e.g. **7.7/10** — final ranking score |
| Date | "6 Oct 2026" |
| Also in | optional: "Also in: LLMs for Code" (paper fits several topics) |
| Title | link to arXiv, 1–3 lines |
| Authors | "Edan Kinderman, Elad Hoffer, Yochai Blau and others" + affiliations if known ("Google DeepMind, Stanford") |
| Summary | 1–2 sentences |
| Key finding | 1 sentence, often with numbers |
| Why it matters | 1 sentence |
| Client angle | 1 sentence |
| Method, Limitations | only when detail level = Detailed |
| Why ranked | 1–5 chips, e.g. "unifies RAG and long-context in one mechanism" · "Senior authors (h-index 44)" · "24 upvotes" · "Code released" · "Watch-list: OpenAI" · "You found this author useful". Has one ⓘ explaining. |
| Links | arXiv ↗ · PDF ↗ · Code ↗ (code only sometimes) |
| Feedback (web only) | toggle buttons **Read in full** / **Bring to client** / **Not useful** (one active at a time, click again to undo) · **☆ Star / ★ Starred** · **Add note** → expands a note textarea + "Client tag" input (e.g. "Acme Bank"). Small "Saving… / Saved" status |

Idea space: progressive disclosure (show verdict, title, summary, key finding; tap to expand why it matters / client angle / chips), swipe or thumb-friendly feedback row, compact vs comfortable density.

**Sidebar — Refresh now** (generate a brief on demand)
- Collapsed: title, one-line description, **Refresh…** button
- Expanded form:
  - Window: segmented choice **Since last brief** · **Last 7 days** · **Custom range** (+ two date inputs, max 31 days). One ⓘ explains.
  - Domains: toggle pills per topic (selected = filled); paused topics labelled "(paused)"
  - Checkbox: "Email this brief when ready"
  - **Generate brief** · **Cancel**
  - Cooldown state: button reads "Available in 4:32" (10-minute wait between refreshes)
  - Errors: e.g. "A run is already in progress"
- Running state: spinner + "Generating brief… 1–3 min", per-topic status rows: Waiting · Collecting papers · Checking authors & likes · AI scoring · Done · Failed · Skipped. Then auto-navigates to the new brief.

**Sidebar — Trends**: per topic, papers scanned now vs previous brief: name, `40 (+5) · 4✓`, two overlaid bars (now = brand colour, before = grey). One ⓘ legend.

**Sidebar — schedule note**: "Emailed automatically every Monday, 5:30–6:29 AM IST (India Standard Time). How papers are scored →". Shows "Delivery is paused" when paused.

**Empty state (first visit):** "No briefs yet — Click Refresh to generate your first brief from this week's arXiv papers."

### 5.2 Archive (`/briefs`)
- Title + one-line description, one ⓘ (PREVIEW vs DELIVERED)
- Filter bar: search text ("Search title, summary, notes…"), topic dropdown, verdict dropdown (READ · read in full / CLIENT · bring to client / FYI · for your information), **Search**, **Clear**
- Default: list of briefs — Week of (link), Window ("4 Oct – 11 Oct"), Scanned, Included, Status badge (+ "emailed")
- With filters: list of matching papers — topic · verdict · score · "Week of …" link, title, summary, her note
- Empty: "No briefs yet…"; "0 matching papers"
- Mobile: table should become cards

### 5.3 Library (`/library`)
- "Papers you starred or marked 'Bring to client', with your notes."
- Client-tag filter pills: All · Acme Bank · …
- Cards: topic, date, ★, CLIENT badge, client tag, title, authors, summary, client angle, the same feedback controls (with note editable)
- Empty: "Nothing here yet. Star a paper or mark it 'Bring to client' in a brief."
- This replaces her old hand-kept "running document" — could feel like a personal notebook.

### 5.4 Runs (`/runs`) — technical log, low emphasis
- One ⓘ: SUCCEEDED / PARTIAL / FAILED / SKIPPED meanings
- Each run = expandable row: status badge (succeeded green, partial amber, failed red, running blue, queued/skipped grey), "11 Oct, 16:16 IST", "Weekly (automatic)" or "Manual", window mode, dates, right side `87s · 300 scanned · 17 included · 10 AI calls`
- Expanded: per-topic rows (name, status, "200 scanned · 5 included", error text, **Retry** button for failed/skipped), footer "arXiv requests: 5 · Author data: ok · Community likes: ok · Open brief"

### 5.5 Scoring (`/scoring`) — explainer page
Eight sections; content is dynamic (reads her current settings):
1. **The five ingredients** — table: Significance (AI), Relevance (AI), Community buzz (Hugging Face upvotes), Author seniority (h-index), Code released; weights per ranking style (Breakthroughs 65/10/12/8/5 · Balanced 55/15/15/10/5 · Broad 45/25/15/10/5), current style highlighted
2. **Bonus points** — +1.5 watch-list match, +0.5 author you liked, capped at 10
3. **How raw numbers become 0–10** — two small lookup tables (upvotes → score; h-index → score)
4. **Worked example** — 8.0×55% = 4.40 … final 7.95/10, ✅ above pass mark 5.0
5. **Who makes it into the brief** — shortlist (relevance ≥ 6, top 10), pass mark, slots per topic, no repeats, reading-time cap, quiet week
6. **Verdict labels** — READ / CLIENT / FYI
7. **If the AI is unavailable** — fallback weights
8. **"Why ranked" chips** — what each chip means

Could be designed as a visual explainer (stacked bar of weights, formula cards) rather than tables.

### 5.6 Settings (`/settings`)

**Domains (topics) list** — per row: on/off switch (off = paused), name, priority badge (high / normal / low priority), italic description, "Categories: cs.AI · Artificial Intelligence, cs.CL · Language AI …", "Keywords: …", "Excludes: …", **Edit**, **Delete** (confirm dialog). **+ Add domain** button.

**Add / Edit domain modal**
- Name
- What counts as relevant (one sentence; placeholder explains the AI uses it)
- Keywords (chip input — type, Enter to add, × to remove)
- arXiv categories — ~25 toggle chips showing code + short meaning, e.g. `cs.CL · Language AI`, `cs.IR · Search & Retrieval`, `cs.CV · Computer Vision` (one ⓘ). *This is the noisiest part of the UI today — please find a better pattern (grouping, search, multi-select).*
- Exclude papers containing (chip input)
- Priority select (High — shown first, +1 paper / Normal / Low — 1 fewer paper)
- Papers per domain select (Use global setting / 1–8)
- Active checkbox
- **Preview query** box: "Test on the last 7 days of arXiv — no AI used" → result "40 papers matched" (+ warning if > 150 "consider narrower keywords" or 0 "try broader keywords") + 5 example titles as links
- Error text, **Cancel**, **Save domain**

**Brief preferences** (form, then **Save preferences** + "Saved")
- Schedule row: "Schedule: every Monday, 5:30–6:29 AM IST (India Standard Time)" (ⓘ: fixed in code) + **Pause Monday delivery** checkbox (saves instantly)
- Recipient email · Papers per domain (1–8) · Significance threshold (0–10, ⓘ "pass mark") · Ranking style (Breakthroughs only / Balanced / Broad, ⓘ) · Reading time cap (5 / 10 min) · Detail level (Short — one-line summary / Standard / Detailed — adds method & limitations) · Days to look back · Client lens (placeholder "e.g. banking — tailors the client angle")
- **Watch-list** (one ⓘ: +1.5 boost) — Authors, Labs / organisations (pre-filled: Google DeepMind, OpenAI, Meta, Microsoft Research, Anthropic, Stanford, MIT, Carnegie Mellon), Benchmarks / terms — all chip inputs
- Signal sources: arXiv (always on, disabled) · Semantic Scholar — author seniority · Hugging Face — community likes
- Refresh cooldown (minutes) · Email manual refreshes by default

Suggestion welcome: group into sections/cards (Delivery · What gets included · Writing style · Watch-list · Advanced).

### 5.7 Unlock (`/unlock`)
Small centred card: "Enter passcode", explanation (Settings, Refresh, Send and Feedback need the passcode; reading is public), password input, error "Wrong passcode", **Unlock**.

### 5.8 Global
- Header: logo dot + "Research Pulse", optional amber **TEST** badge (test mode), nav tabs
- Footer: "Research Pulse · Papers: arXiv · Author data: Semantic Scholar · Community likes: Hugging Face · AI: Gemini Flash · For Kavita only"
- Tooltip component (ⓘ): small circled "i", dark popover on hover/tap. Keep usage rare (≤ 1 per row).

---

## 6. The weekly email (also needs a design)

- Rendered by email clients → **inline styles only, max width 640 px, no JS, no web fonts guaranteed, table-friendly layout**
- Content: "RESEARCH PULSE" eyebrow · "Week of 11 Oct 2026" · date range · stats · ~min read · headline-of-the-week box · one legend line ("Verdicts: READ = read in full · CLIENT = bring to a client · FYI = for your information. Scores are out of 10.") · notices · per topic: name, italic topic summary, paper cards (badge, score, date, title link, authors + affiliations, Summary, Key finding, Why it matters, Client angle, Why ranked, arXiv · PDF · Code links) · quiet-week / closest-miss text · footer: "Open in Research Pulse" (to mark papers) · "Manage domains"
- No feedback buttons in email (feedback happens on the site)

---

## 7. Real sample content (use for mock-ups)

**Headline of the week**
> This week's research in Retrieval-Augmented Generation highlights advances in unified architectures, automated pipeline optimization, and multi-source structural navigation. Key developments include UNREAL's integration of retrieval and long-context capabilities into a single model, alongside Agentic AutoRAG's reasoning-driven pipeline optimization.

**Topic summary (RAG):** Advances in RAG focus on multi-source structural navigation, unified long-context architectures, and automated agentic pipeline optimization.

**Paper card**
- READ · 7.7/10 · 6 Oct 2026
- **UNREAL: Unifying Retrieval and Long-Context with a Single Model**
- Edan Kinderman, Elad Hoffer, Yochai Blau and others
- **Summary:** UNREAL integrates corpus retrieval and long-context filtering directly within a frozen LLM using internal representations and under 500K parameters.
- **Key finding:** On a 21M-chunk index, it increased HotpotQA recall from 49.1% to 73.2% and boosted 128K-token NoLiMa long-context accuracy from 1.0% to 24.83%.
- **Why it matters:** Demonstrates that standalone retriever-reranker stacks can be replaced by the generation model's own representations.
- **Client angle:** Enterprises may reduce pipeline complexity by running retrieval directly inside the primary model infrastructure.
- **Why ranked:** unifies RAG and long-context in one mechanism · large retrieval recall gains with minimal parameter overhead · Senior authors (h-index 44) · 24 upvotes
- arXiv ↗ · PDF ↗

**Second card (CLIENT, with code)**
- CLIENT · 6.2/10 · 6 Oct 2026 — **Agentic AutoRAG: RAG Pipeline Optimization through Reasoning-Driven Agents** — Lasse B. Strand, Robert Jakob, Kevin O'Sullivan and others — Key finding: On a healthcare corpus, it achieved 77% median accuracy at 58% of the leading baseline's cost per query. — Why ranked: significant cost-efficiency optimization · Code released — arXiv ↗ · PDF ↗ · Code ↗

**Typical numbers:** 4 topics, 300 papers scanned, 13–17 included, 6–9 min read, scores 5.0–8.5. Titles often 80–120 characters. Topic names up to ~30 characters ("Retrieval-Augmented Generation").

---

## 8. Current visual system (starting point — feel free to evolve)

| Token | Value | Use |
|---|---|---|
| background | `#f3f5f2` | page |
| surface | `#ffffff` | cards |
| foreground | `#17201b` | text |
| muted | `#5f6b64` | secondary text |
| line | `#dfe5df` | borders |
| brand | `#1f5c3f` | deep green — headings, primary buttons, links |
| brand-soft | `#e3f0e7` | chips, hover |
| READ | blue-600 `#2563eb` | verdict |
| CLIENT | green-700 `#15803d` | verdict |
| FYI | gray-200 bg / gray-700 text | verdict |
| warning | amber-50/100 bg, amber-800/900 text | notices, PREVIEW, TEST |
| error | red-50 bg, red-700/800 text | failed topic |

- Font: **Geist** (sans) + Geist Mono for numbers/scores. Body 15 px in cards.
- Radius: cards 12 px, buttons 6 px, chips full-round.
- Brand colour comes from the Components Map diagram (deep green). Light theme only today; a dark mode would be a bonus.

**Known problems to fix**
1. Paper cards are long walls of text — weak hierarchy between title, verdict and the four text fields.
2. Settings is a long, flat form; arXiv category chips are noisy.
3. Sidebar competes with the brief on desktop and pushes content down on mobile.
4. Archive and Runs use tables that don't adapt to phones.
5. Action buttons + "✓ Emailed" chip feel cluttered at the top of the brief.
6. Overall it looks like a generic admin UI rather than a premium research newsletter.

---

## 9. Constraints for the build

- **Stack:** Next.js 16 (App Router, React 19) + **Tailwind CSS v4** (tokens in `app/globals.css` via `@theme`). No paid UI libraries; free icon set (e.g. Lucide) is fine.
- Pages are server-rendered; interactive pieces (feedback buttons, refresh panel, settings forms, tooltips) are small client components.
- Must support: 375 px mobile → 1280 px desktop; keyboard navigation and visible focus; colour contrast WCAG AA; print stylesheet (hide nav, buttons, feedback; cards don't split across pages).
- All content above is dynamic — designs must handle long titles, 0–6 cards per topic, missing affiliations/code links, AI-unavailable cards, 1–10 topics.

## 10. What to deliver

1. Visual direction (type scale, colour, spacing, components) as updated design tokens.
2. Mobile + desktop designs for: Brief (with all card states), Refresh panel (idle / form / running / cooldown), Archive, Library, Settings (+ domain modal), Scoring, Runs, empty states.
3. The weekly email layout (640 px, inline-style friendly).
4. Component specs for: paper card, verdict badge, score, chips, feedback row, notice, topic header, status badge, tooltip, form fields, chip input, toggle switch.
5. Ideally HTML/Tailwind or React code that can be dropped into the existing Next.js components.
