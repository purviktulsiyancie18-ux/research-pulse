import { Briefcase, ExternalLink, Lightbulb, TrendingUp } from "lucide-react";
import { authorLine, fmtDate, type Card } from "@/lib/brief";
import { TIPS } from "@/lib/glossary";
import { Disclosure } from "./Disclosure";
import { FeedbackControls } from "./FeedbackControls";
import { InfoTip } from "./InfoTip";
import { TopPickBadge, VerdictBadge } from "./ui";

/** Colour a "why ranked" chip by what it means. */
function chipClass(chip: string) {
  if (chip.startsWith("Senior authors")) return "bg-sky/12 text-sky-ink";
  if (/^\d+ upvotes?$/.test(chip)) return "bg-pink/12 text-pink-ink";
  if (chip === "Code released") return "bg-lime/14 text-lime-ink";
  if (chip.startsWith("Watch-list")) return "bg-primary-tint text-primary-pressed";
  if (chip === "You found this author useful") return "bg-amber/14 text-amber-ink";
  return "bg-hover text-body";
}

function Panel({ label, icon, tone = "outline", children }: { label: string; icon?: React.ReactNode; tone?: "outline" | "teal" | "fill"; children: React.ReactNode }) {
  if (!children) return null;
  const cls =
    tone === "teal" ? "border border-teal/28 bg-teal/7" : tone === "fill" ? "bg-panel" : "border border-line bg-surface";
  const labelCls = tone === "teal" ? "text-teal-ink" : tone === "fill" ? "text-primary-hover" : "text-muted-text";
  return (
    <div className={`rounded-panel px-[18px] py-3.5 ${cls}`}>
      <p className={`eyebrow flex items-center gap-1.5 ${labelCls}`}>
        {icon}
        {label}
      </p>
      <p className="mt-1 text-[15px] leading-6 font-medium text-heading">{children}</p>
    </div>
  );
}

export function PaperCard({
  card,
  briefId,
  topPick = false,
  feedback = true,
}: {
  card: Card;
  briefId: string | null;
  topPick?: boolean;
  feedback?: boolean;
}) {
  const links = (
    <div className="flex items-center gap-1">
      {[
        { href: card.absUrl, label: "arXiv", title: TIPS.arxiv },
        card.pdfUrl ? { href: card.pdfUrl, label: "PDF", title: "Full paper (PDF)" } : null,
        card.codeUrl ? { href: card.codeUrl, label: "Code", title: "The authors' code" } : null,
      ]
        .filter(Boolean)
        .map((l) => (
          <a
            key={l!.label}
            href={l!.href}
            target="_blank"
            rel="noreferrer"
            title={l!.title}
            className="inline-flex min-h-11 items-center gap-1 rounded-control px-2.5 font-display text-[13px] font-semibold text-body hover:bg-hover hover:text-heading"
          >
            {l!.label} <ExternalLink size={13} />
          </a>
        ))}
    </div>
  );

  return (
    <article
      className="group rounded-card border bg-surface shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover"
      style={{
        padding: "clamp(20px,4vw,32px)",
        ...(topPick
          ? { background: "linear-gradient(160deg, rgba(37,99,235,0.07), #FFFFFF 45%)", borderColor: "rgba(37,99,235,0.35)" }
          : { borderColor: "var(--color-line)" }),
      }}
    >
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        {topPick && <TopPickBadge />}
        <VerdictBadge verdict={card.verdict} />
        <span className="inline-flex items-center gap-2" title={TIPS.score}>
          <span className="font-display text-[15px] font-extrabold text-heading font-tabular">
            {card.score.toFixed(1)}
            <span className="text-[12px] font-semibold text-muted-text">/10</span>
          </span>
          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-divider" aria-hidden>
            <span className="block h-full rounded-full bg-gradient-primary" style={{ width: `${Math.min(100, card.score * 10)}%` }} />
          </span>
        </span>
        <span className="text-[12px] text-muted-text">{fmtDate(card.publishedAt)}</span>
        {card.alsoRelevantTo.length > 0 && (
          <span className="rounded-full bg-hover px-2.5 py-0.5 text-[12px] font-medium text-body" title={TIPS.alsoRelevant}>
            Also in: {card.alsoRelevantTo.join(", ")}
          </span>
        )}
      </div>

      {/* Title + authors */}
      <h3 className="mt-3 font-display font-bold text-heading" style={{ fontSize: "clamp(18px,2.4vw,20px)", lineHeight: 1.45 }}>
        <a href={card.absUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-primary-hover">
          {card.title}
        </a>
      </h3>
      <p className="mt-1 text-[13px] leading-5 text-muted-text">
        {authorLine(card.authors)}
        {card.affiliations.length > 0 && <span className="font-medium text-body"> · {card.affiliations.join(", ")}</span>}
      </p>

      {/* Summary + key finding */}
      {card.aiAvailable ? (
        <>
          <p className="mt-3 max-w-[68ch] text-[16px] leading-[26px] text-body">{card.summary}</p>
          {card.keyFinding && (
            <div className="mt-4">
              <Panel label="Key finding" tone="fill" icon={<TrendingUp size={13} strokeWidth={2.5} />}>
                {card.keyFinding}
              </Panel>
            </div>
          )}
        </>
      ) : (
        <div className="mt-4">
          <Panel label="Abstract" tone="fill">
            {card.summary}
          </Panel>
        </div>
      )}

      {/* Progressive disclosure */}
      <Disclosure label="Why it matters, client angle & signals" aside={links}>
        <div className="mt-2 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}>
          <Panel label="Why it matters" icon={<Lightbulb size={13} strokeWidth={2.5} />}>
            {card.whyItMatters}
          </Panel>
          <Panel label="Client angle" tone="teal" icon={<Briefcase size={13} strokeWidth={2.5} />}>
            {card.clientAngle}
          </Panel>
          <Panel label="Method">{card.method}</Panel>
          <Panel label="Limitations">{card.limitations}</Panel>
        </div>
        {card.chips.length > 0 && (
          <div className="mt-4">
            <p className="eyebrow flex items-center text-muted-text">
              Why ranked
              <InfoTip text={TIPS.whyRanked} align="left" />
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {card.chips.map((c) => (
                <span key={c} className={`rounded-full px-2.5 py-1 text-[12px] leading-4 font-medium ${chipClass(c)}`}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </Disclosure>

      {feedback && <FeedbackControls arxivId={card.arxivId} domainId={card.domainId} briefId={briefId} initial={card.feedback} />}
    </article>
  );
}
