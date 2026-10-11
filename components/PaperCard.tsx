import { authorLine, fmtDate, type Card } from "@/lib/brief";
import { FeedbackControls } from "./FeedbackControls";

const VERDICT_STYLE: Record<string, string> = {
  READ: "bg-blue-600 text-white",
  CLIENT: "bg-green-700 text-white",
  FYI: "bg-gray-200 text-gray-700",
};

const VERDICT_HINT: Record<string, string> = {
  READ: "Worth reading in full",
  CLIENT: "Worth bringing to a client",
  FYI: "Good to know",
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
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        {card.verdict ? (
          <span title={VERDICT_HINT[card.verdict]} className={`rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide ${VERDICT_STYLE[card.verdict]}`}>
            {card.verdict}
          </span>
        ) : (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">AI summary unavailable</span>
        )}
        <span className="font-mono font-semibold text-foreground" title="Final score (0–10)">
          {card.score.toFixed(1)}
        </span>
        <span>·</span>
        <span>{fmtDate(card.publishedAt)}</span>
        {card.alsoRelevantTo.length > 0 && <span className="italic">· Also relevant to: {card.alsoRelevantTo.join(", ")}</span>}
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
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Why ranked</span>
          {card.chips.map((c) => (
            <span key={c} className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
        <a href={card.absUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
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
