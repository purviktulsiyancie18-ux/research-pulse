import { authorLine, fmtDate, type Card } from "@/lib/brief";
import { TIPS, VERDICT_LABELS } from "@/lib/glossary";
import { FeedbackControls } from "./FeedbackControls";
import { InfoTip } from "./InfoTip";

const VERDICT_STYLE: Record<string, string> = {
  READ: "bg-blue-600 text-white",
  CLIENT: "bg-green-700 text-white",
  FYI: "bg-gray-200 text-gray-700",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 text-[15px] leading-relaxed">
      <span className="font-semibold text-foreground">{label}: </span>
      <span className="text-[#2b352f]">{children}</span>
    </p>
  );
}

export function PaperCard({ card, briefId, feedback = true }: { card: Card; briefId: string | null; feedback?: boolean }) {
  return (
    <article className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        {card.verdict ? (
          <span
            title={`${VERDICT_LABELS[card.verdict]} (AI's advice)`}
            className={`cursor-help rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide ${VERDICT_STYLE[card.verdict]}`}
          >
            {card.verdict}
          </span>
        ) : (
          <span
            title="Gemini AI did not respond, so the paper's own summary is shown."
            className="cursor-help rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800"
          >
            AI summary unavailable
          </span>
        )}
        <span className="cursor-help text-foreground" title={TIPS.score}>
          <span className="font-mono font-semibold">{card.score.toFixed(1)}</span>
          <span className="text-muted">/10</span>
        </span>
        <span>·</span>
        <span>{fmtDate(card.publishedAt)}</span>
        {card.alsoRelevantTo.length > 0 && (
          <span className="italic" title={TIPS.alsoRelevant}>
            · Also in: {card.alsoRelevantTo.join(", ")}
          </span>
        )}
      </div>

      <h3 className="mt-1.5 text-lg font-semibold leading-snug">
        <a href={card.absUrl} target="_blank" rel="noreferrer" className="hover:text-brand hover:underline">
          {card.title}
        </a>
      </h3>
      <p className="mt-0.5 text-sm text-muted">
        {authorLine(card.authors)}
        {card.affiliations.length > 0 && <> · {card.affiliations.join(", ")}</>}
      </p>

      <Field label="Summary">{card.summary}</Field>
      <Field label="Key finding">{card.keyFinding}</Field>
      <Field label="Why it matters">{card.whyItMatters}</Field>
      <Field label="Client angle">{card.clientAngle}</Field>
      <Field label="Method">{card.method}</Field>
      <Field label="Limitations">{card.limitations}</Field>

      {card.chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-muted">
            Why ranked
            <InfoTip text={TIPS.whyRanked} align="left" />
          </span>
          {card.chips.map((c) => (
            <span key={c} className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium">
        <a href={card.absUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline" title={TIPS.arxiv}>
          arXiv ↗
        </a>
        {card.pdfUrl && (
          <a href={card.pdfUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
            PDF ↗
          </a>
        )}
        {card.codeUrl && (
          <a href={card.codeUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
            Code ↗
          </a>
        )}
      </div>

      {feedback && <FeedbackControls arxivId={card.arxivId} domainId={card.domainId} briefId={briefId} initial={card.feedback} />}
    </article>
  );
}
