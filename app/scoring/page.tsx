import Link from "next/link";
import { effectiveThreshold, FALLBACK_WEIGHTS, normAuthor, normCommunity, scorePaper, STYLES } from "@/lib/ranking";
import { getSettings } from "@/lib/repo";
import type { RankingStyle } from "@/lib/types";
import { InfoTip } from "@/components/InfoTip";

export const dynamic = "force-dynamic";

const STYLE_NAMES: Record<RankingStyle, string> = {
  breakthroughs: "Breakthroughs only",
  balanced: "Balanced",
  broad: "Broad",
};

const INGREDIENTS = [
  {
    key: "sig",
    name: "Significance",
    what: "How important or new the paper is — new record result, strong evidence, changes how the problem is seen, likely impact",
    source: "Gemini AI reads the paper's abstract and rates it 0–10",
  },
  {
    key: "rel",
    name: "Relevance",
    what: "How squarely the paper fits the topic, judged against the topic's “what counts as relevant” line in Settings",
    source: "Gemini AI, 0–10",
  },
  {
    key: "comm",
    name: "Community buzz",
    what: "How many Hugging Face members liked (upvoted) the paper",
    source: "Hugging Face Daily Papers",
  },
  {
    key: "auth",
    name: "Author seniority",
    what: "The highest h-index among the authors — how often their work is cited",
    source: "Semantic Scholar",
  },
  {
    key: "code",
    name: "Code released",
    what: "Whether the authors published their code on GitHub, so others can check and reuse the results",
    source: "arXiv comments, Hugging Face or Semantic Scholar",
  },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold text-brand">{title}</h2>
      <div className="mt-2 text-[15px] leading-relaxed">{children}</div>
    </section>
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
  const w = STYLES[style].weights;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">How papers are scored</h1>
        <p className="text-sm text-muted">
          The rules used to decide which papers make it into the brief. Every paper gets a score from 0 to 10.
          Your current style is <strong>{STYLE_NAMES[style]}</strong> and the pass mark is <strong>{threshold.toFixed(1)}</strong> — change both in{" "}
          <Link href="/settings" className="text-brand underline">
            Settings
          </Link>
          .
        </p>
      </div>

      <Section title="1. The five ingredients">
        <p>
          Each ingredient becomes a number from 0 to 10, then is multiplied by its weight.
          <InfoTip text="Weight = the ingredient's share of the final score. The weights change with the ranking style chosen in Settings." align="left" />
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-3">Ingredient</th>
                <th className="py-2 pr-3">What it measures</th>
                {(Object.keys(STYLES) as RankingStyle[]).map((s) => (
                  <th key={s} className={`py-2 pr-2 text-right ${s === style ? "text-brand" : ""}`}>
                    {STYLE_NAMES[s]}
                    {s === style && <span className="block text-[10px] normal-case">your setting</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INGREDIENTS.map((ing) => (
                <tr key={ing.key} className="border-b border-line align-top last:border-0">
                  <td className="py-2 pr-3 font-medium">{ing.name}</td>
                  <td className="py-2 pr-3 text-[#38443d]">
                    {ing.what}
                    <span className="block text-xs text-muted">Source: {ing.source}</span>
                  </td>
                  {(Object.keys(STYLES) as RankingStyle[]).map((s) => (
                    <td key={s} className={`py-2 pr-2 text-right font-mono ${s === style ? "font-bold text-brand" : "text-muted"}`}>
                      {Math.round(STYLES[s].weights[ing.key] * 100)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="2. Bonus points">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>+1.5 Watch-list match</strong> — an author, lab or term from your follow list in Settings appears in the paper
          </li>
          <li>
            <strong>+0.5 Author you liked</strong> — you marked 2 or more of their papers “Read in full” or “Bring to client”
          </li>
          <li>The final score is capped at 10.</li>
        </ul>
      </Section>

      <Section title="3. How raw numbers become 0–10">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-medium">Community buzz (upvotes)</p>
            <p className="text-xs text-muted">Formula: 2 × log₂(1 + upvotes), max 10 — early likes count most</p>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {[0, 1, 3, 7, 15, 31].map((u) => (
                  <tr key={u} className="border-b border-line last:border-0">
                    <td className="py-1">{u === 31 ? "31 or more" : u} upvotes</td>
                    <td className="py-1 text-right font-mono">{normCommunity(u).toFixed(0)} / 10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="font-medium">Author seniority (h-index)</p>
            <p className="text-xs text-muted">Formula: h-index ÷ 8, max 10 — an h-index of 40 means 40 papers each cited 40+ times</p>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {[0, 8, 20, 40, 60, 80].map((h) => (
                  <tr key={h} className="border-b border-line last:border-0">
                    <td className="py-1">h-index {h === 80 ? "80 or more" : h}</td>
                    <td className="py-1 text-right font-mono">{normAuthor(h).toFixed(1)} / 10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-sm">
          <strong>Significance</strong> and <strong>Relevance</strong> come straight from Gemini (0–10). <strong>Code released</strong> is 10 if code
          is available, otherwise 0.
        </p>
      </Section>

      <Section title="4. Worked example">
        <p className="text-sm text-muted">A paper with significance 8, relevance 9, 15 upvotes, an author with h-index 40 and released code:</p>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {INGREDIENTS.map((ing) => {
              const c = example.breakdown.components[ing.key];
              return (
                <tr key={ing.key} className="border-b border-line">
                  <td className="py-1">{ing.name}</td>
                  <td className="py-1 text-right font-mono text-muted">
                    {c.value.toFixed(1)} × {Math.round(w[ing.key] * 100)}%
                  </td>
                  <td className="py-1 text-right font-mono">= {c.contribution.toFixed(2)}</td>
                </tr>
              );
            })}
            <tr>
              <td className="py-1 font-semibold">Final score</td>
              <td />
              <td className="py-1 text-right font-mono font-bold text-brand">{example.final.toFixed(2)} / 10</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-sm">
          {example.final >= threshold ? "✅ Above" : "❌ Below"} your pass mark of {threshold.toFixed(1)}, so it{" "}
          {example.final >= threshold ? "would be included" : "would not be included"}.
        </p>
      </Section>

      <Section title="5. Who makes it into the brief">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            <strong>Shortlist:</strong> Gemini rates every new paper&apos;s relevance. Only papers scoring <strong>6 or more</strong> go forward, and at most
            the <strong>top 10 per topic</strong> get a full write-up.
          </li>
          <li>
            <strong>Pass mark:</strong> the final score must be at least <strong>{threshold.toFixed(1)}</strong>
            <InfoTip
              text={`Your threshold of ${settings.significance_threshold}${
                STYLES[style].thresholdDelta !== 0
                  ? `, ${STYLES[style].thresholdDelta > 0 ? "plus" : "minus"} ${Math.abs(STYLES[style].thresholdDelta)} for the ${STYLE_NAMES[style]} style`
                  : ""
              }.`}
            />
            .
          </li>
          <li>
            <strong>Slots per topic:</strong> up to {STYLES[style].slots(settings.papers_per_domain)} papers. High-priority topics get 1 extra slot;
            low-priority topics get 1 fewer.
          </li>
          <li>
            <strong>No repeats:</strong> a paper that fits two topics appears once, under the topic where it scored highest. Papers already sent, or marked “Not useful”, never appear again.
          </li>
          <li>
            <strong>Reading-time cap:</strong> if the brief is longer than {settings.reading_minutes} minutes to read, the
            lowest-scoring papers from low-priority topics are dropped first — every topic keeps at least one paper.
          </li>
          <li>
            <strong>Quiet week:</strong> if nothing in a topic reaches the pass mark, the brief says so and shows the best candidate under “Closest
            miss”.
          </li>
        </ol>
      </Section>

      <Section title="6. Verdict labels">
        <ul className="space-y-1.5">
          <li>
            <span className="mr-2 rounded bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">READ</span>worth reading in full yourself
          </li>
          <li>
            <span className="mr-2 rounded bg-green-700 px-1.5 py-0.5 text-[11px] font-bold text-white">CLIENT</span>worth bringing up with a client
          </li>
          <li>
            <span className="mr-2 rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-bold text-gray-700">FYI</span>for your information — good to know, no action needed
          </li>
        </ul>
        <p className="mt-2 text-sm text-muted">Gemini chooses the verdict. It is advice only and does not change the score.</p>
      </Section>

      <Section title="7. If the AI is unavailable">
        <p>
          If Gemini does not respond, the brief is still sent. Papers are ranked on the remaining signals only:{" "}
          {Math.round(FALLBACK_WEIGHTS.rel * 100)}% keyword match, {Math.round(FALLBACK_WEIGHTS.comm * 100)}%
          community buzz, {Math.round(FALLBACK_WEIGHTS.auth * 100)}% author seniority and {Math.round(FALLBACK_WEIGHTS.code * 100)}% code released. Cards
          then show the paper&apos;s own summary with an “AI summary unavailable” tag. If Semantic Scholar or Hugging Face is down, that ingredient&apos;s
          weight is shared out among the others.
        </p>
      </Section>

      <Section title="8. “Why ranked” chips on each paper">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Short phrases from Gemini — the reasons it gave for the significance score</li>
          <li>
            <strong>Senior authors (h-index N)</strong> — at least one author has an h-index of 30 or more
          </li>
          <li>
            <strong>N upvotes</strong> — Hugging Face community likes
          </li>
          <li>
            <strong>Code released</strong> — the authors shared their code
          </li>
          <li>
            <strong>Watch-list: X</strong> — matched your follow list (+1.5)
          </li>
          <li>
            <strong>You found this author useful</strong> — based on your feedback (+0.5)
          </li>
        </ul>
      </Section>
    </div>
  );
}
