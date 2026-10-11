import { CircleCheck } from "lucide-react";
import { ScoringIngredients, StackedBar } from "@/components/ScoringIngredients";
import { INGREDIENTS } from "@/lib/ingredients";
import { PageHeader, VerdictBadge } from "@/components/ui";
import { effectiveThreshold, FALLBACK_WEIGHTS, normAuthor, normCommunity, scorePaper, STYLES } from "@/lib/ranking";
import { getSettings } from "@/lib/repo";
import type { RankingStyle } from "@/lib/types";

export const dynamic = "force-dynamic";

const STYLE_NAMES: Record<RankingStyle, string> = { breakthroughs: "Breakthroughs only", balanced: "Balanced", broad: "Broad" };

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="h3 flex items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary font-display text-[14px] font-extrabold text-white">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-4 text-[15px] leading-6 text-body">{children}</div>
    </section>
  );
}

function Lookup({ title, formula, rows }: { title: string; formula: string; rows: [string, string][] }) {
  return (
    <div className="panel p-4">
      <p className="font-display text-[14px] font-bold text-heading">{title}</p>
      <p className="text-[12px] text-muted-text">{formula}</p>
      <ul className="mt-2 divide-y divide-divider">
        {rows.map(([k, v]) => (
          <li key={k} className="flex justify-between py-1.5 text-[14px]">
            <span>{k}</span>
            <span className="font-display font-bold text-heading font-tabular">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ScoringPage() {
  const settings = await getSettings();
  const style = settings.ranking_style;
  const threshold = effectiveThreshold(settings);
  const example = scorePaper(
    { significance: 8, significanceReasons: [], relevance: 9, upvotes: 15, maxHIndex: 40, hasCode: true, watch: [], usefulAuthorBoost: false },
    style,
  );
  const weights = Object.fromEntries((Object.keys(STYLES) as RankingStyle[]).map((s) => [s, STYLES[s].weights])) as Record<
    RankingStyle,
    (typeof STYLES)["balanced"]["weights"]
  >;
  const delta = STYLES[style].thresholdDelta;

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-6">
      <PageHeader
        title="How papers are scored"
        description={`Every paper gets a score from 0 to 10. Your style is ${STYLE_NAMES[style]} and your pass mark is ${threshold.toFixed(1)} — change both in Settings.`}
      />

      <Section n={1} title="The five ingredients">
        <p className="mb-4">Each ingredient becomes a number from 0 to 10, then counts for its share of the score.</p>
        <ScoringIngredients weights={weights} current={style} />
      </Section>

      <Section n={2} title="Bonus points">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-panel bg-primary-tint px-4 py-3">
            <span className="font-display text-[18px] font-extrabold text-primary-hover">+1.5</span>
            <span className="text-heading">Matches your watch-list — an author, lab or term you follow</span>
          </div>
          <div className="flex items-center gap-3 rounded-panel bg-teal/10 px-4 py-3">
            <span className="font-display text-[18px] font-extrabold text-teal-ink">+0.5</span>
            <span className="text-heading">By an author whose papers you marked Useful or bookmarked before</span>
          </div>
          <p className="text-[13px] text-muted-text">The final score is capped at 10.</p>
        </div>
      </Section>

      <Section n={3} title="Raw numbers → 0–10">
        <div className="grid gap-3 sm:grid-cols-2">
          <Lookup
            title="Community buzz"
            formula="2 × log₂(1 + upvotes) — early likes count most"
            rows={[0, 1, 3, 7, 15, 31].map((u) => [`${u === 31 ? "31+" : u} upvotes`, `${normCommunity(u).toFixed(0)}/10`])}
          />
          <Lookup
            title="Author seniority"
            formula="h-index ÷ 8 — h-index = how often a researcher's work is cited"
            rows={[0, 8, 20, 40, 60, 80].map((h) => [`h-index ${h === 80 ? "80+" : h}`, `${normAuthor(h).toFixed(1)}/10`])}
          />
        </div>
        <p className="mt-3 text-[14px]">Significance and Relevance come straight from Gemini (0–10). Code released is 10 if code is available, otherwise 0.</p>
      </Section>

      <Section n={4} title="Worked example">
        <p className="text-[14px] text-muted-text">Significance 8, relevance 9, 15 upvotes, an author with h-index 40, and released code:</p>
        <ul className="mt-3 divide-y divide-divider">
          {INGREDIENTS.map((i) => {
            const c = example.breakdown.components[i.key];
            return (
              <li key={i.key} className="flex items-center gap-3 py-2 text-[14px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
                <span className="flex-1 text-heading">{i.name}</span>
                <span className="text-muted-text font-tabular">
                  {c.value.toFixed(1)} × {Math.round(c.weight * 100)}%
                </span>
                <span className="w-14 text-right font-display font-bold text-heading font-tabular">= {c.contribution.toFixed(2)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-panel bg-panel px-4 py-3">
          <span className="font-display text-[15px] font-bold text-heading">Final score</span>
          <span className="font-display text-[24px] font-extrabold text-primary-hover font-tabular">
            {example.final.toFixed(2)}
            <span className="text-[14px] text-muted-text">/10</span>
          </span>
          {example.final >= threshold ? (
            <span className="pill ml-auto bg-success/12 text-success-ink">
              <CircleCheck size={13} /> Above pass mark {threshold.toFixed(1)}
            </span>
          ) : (
            <span className="pill ml-auto bg-error/10 text-error-ink">Below pass mark {threshold.toFixed(1)}</span>
          )}
        </div>
      </Section>

      <Section n={5} title="Who makes it into the brief">
        <ol className="flex flex-col gap-3">
          {[
            ["Shortlist", "Gemini rates every new paper's relevance. Only papers scoring 6 or more go forward, and at most the top 10 per topic get a full write-up."],
            [
              "Pass mark",
              `The final score must be at least ${threshold.toFixed(1)}${delta ? ` (your threshold of ${settings.significance_threshold} ${delta > 0 ? "+" : "−"} ${Math.abs(delta)} for ${STYLE_NAMES[style]})` : ""}.`,
            ],
            ["Slots per topic", `Up to ${STYLES[style].slots(settings.papers_per_domain)} papers. High-priority topics get 1 extra; low-priority topics get 1 fewer.`],
            ["No repeats", "A paper that fits two topics appears once, under the topic where it scored highest. Papers already sent, or marked “Not useful”, never appear again."],
            ["Reading-time cap", `If the brief would take longer than ${settings.reading_minutes} minutes, the lowest-scoring papers from low-priority topics are dropped first — every topic keeps at least one.`],
            ["Quiet week", "If nothing in a topic reaches the pass mark, the brief says so and shows the closest miss."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary font-display text-[13px] font-extrabold text-white">
                {i + 1}
              </span>
              <span>
                <strong className="font-display font-bold text-heading">{t}.</strong> {d}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section n={6} title="AI suggestions">
        <ul className="flex flex-col gap-2.5">
          <li className="flex items-center gap-3">
            <VerdictBadge verdict="READ" /> Worth reading in full yourself
          </li>
          <li className="flex items-center gap-3">
            <VerdictBadge verdict="CLIENT" /> Worth sharing with a client
          </li>
          <li className="flex items-center gap-3">
            <VerdictBadge verdict="FYI" /> For your information — good to know
          </li>
        </ul>
        <p className="mt-3 text-[13px] text-muted-text">
          Gemini makes the suggestion. It is advice only and does not change the score. Your own feedback — Useful, Not useful and Bookmark — is what
          teaches the ranking.
        </p>
      </Section>

      <Section n={7} title="If the AI is unavailable">
        <p className="mb-3">The brief is still sent. Papers are ranked on the remaining signals, and cards show the paper&apos;s own abstract.</p>
        <StackedBar weights={{ rel: FALLBACK_WEIGHTS.rel, comm: FALLBACK_WEIGHTS.comm, auth: FALLBACK_WEIGHTS.auth, code: FALLBACK_WEIGHTS.code }} />
        <p className="mt-2 text-[13px] text-muted-text">
          Relevance here comes from keyword matches. If Semantic Scholar or Hugging Face is down, its share is spread across the others.
        </p>
      </Section>

      <Section n={8} title="“Why ranked” chips">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["bg-hover text-body", "unifies RAG and long-context", "The AI's reasons for the significance score"],
            ["bg-sky/12 text-sky-ink", "Senior authors (h-index 44)", "An author has an h-index of 30 or more"],
            ["bg-pink/12 text-pink-ink", "24 upvotes", "Hugging Face community likes"],
            ["bg-lime/14 text-lime-ink", "Code released", "The authors shared their code"],
            ["bg-primary-tint text-primary-pressed", "Watch-list: OpenAI", "Matched your follow list (+1.5)"],
            ["bg-amber/14 text-amber-ink", "You found this author useful", "You marked 2+ of their papers Useful or bookmarked them (+0.5)"],
          ].map(([cls, chip, meaning]) => (
            <div key={chip} className="panel px-4 py-3">
              <span className={`inline-block rounded-full px-2.5 py-1 text-[12px] font-medium ${cls}`}>{chip}</span>
              <p className="mt-1.5 text-[13px] text-muted-text">{meaning}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
