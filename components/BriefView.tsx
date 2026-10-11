import Link from "next/link";
import { briefToMarkdown, fmtDate, statsLine, type BriefView as View } from "@/lib/brief";
import { appUrl } from "@/lib/email";
import { TIPS } from "@/lib/glossary";
import { BriefActions } from "./BriefActions";
import { PaperCard } from "./PaperCard";

export function BriefView({ view, showTitleLink = false }: { view: View; showTitleLink?: boolean }) {
  const lastUpdated = new Date(view.createdAt).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const title = `Week of ${fmtDate(view.windowEnd)}`;
  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              title={view.status === "delivered" ? TIPS.delivered : TIPS.preview}
              className={`cursor-help rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${
                view.status === "delivered" ? "bg-brand text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {view.status === "delivered" ? "DELIVERED" : "PREVIEW"}
            </span>
            <span className="text-xs text-muted">Last updated {lastUpdated} IST</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {showTitleLink ? (
              <Link href={`/briefs/${view.id}`} className="hover:text-brand">
                {title}
              </Link>
            ) : (
              title
            )}
          </h1>
          <p className="text-sm text-muted">
            {fmtDate(view.windowStart)} – {fmtDate(view.windowEnd)} · {statsLine(view)} · ~{view.readingMinutes ?? "?"} min read
          </p>
        </div>
        <BriefActions
          briefId={view.id}
          status={view.status}
          emailedAt={view.emailedAt}
          markdown={briefToMarkdown(view, appUrl())}
        />
      </div>

      {view.headline && (
        <div className="mt-4 rounded-r-lg border-l-4 border-brand bg-surface px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Headline of the week</p>
          <p className="mt-1 text-[15px] leading-relaxed">{view.headline}</p>
        </div>
      )}

      {view.notices.map((n) => (
        <p key={n} className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⚠️ {n}
        </p>
      ))}

      {view.sections.length > 1 && (
        <nav className="no-print mt-4 flex flex-wrap gap-1.5 text-xs">
          {view.sections.map((s) => (
            <a key={s.domain.id} href={`#d-${s.domain.id}`} className="rounded-full border border-line bg-surface px-2.5 py-1 hover:border-brand hover:text-brand">
              {s.domain.name} <span className="text-muted">({s.cards.length})</span>
            </a>
          ))}
        </nav>
      )}

      {view.sections.map((s) => (
        <section key={s.domain.id} id={`d-${s.domain.id}`} className="mt-8 scroll-mt-16">
          <h2 className="border-b-2 border-brand-soft pb-1 text-xl font-bold text-brand">{s.domain.name}</h2>
          {s.notice && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">⚠️ {s.notice}</p>}
          {s.headline && s.cards.length > 0 && (
            <p className="mt-2 text-[15px] italic text-[#38443d]">
              <span className="not-italic text-xs font-semibold uppercase tracking-wide text-muted">This week: </span>
              {s.headline}
            </p>
          )}
          {!s.cards.length && !s.notice && (
            <p className="mt-2 text-sm text-muted">Quiet week — nothing scored above your pass mark.</p>
          )}
          <div className="mt-3 flex flex-col gap-3">
            {s.cards.map((c) => (
              <PaperCard key={c.arxivId} card={c} briefId={view.id} />
            ))}
          </div>
          {!s.cards.length && s.closestMiss && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-muted hover:text-brand">Closest miss — show the best paper just below the pass mark</summary>
              <div className="mt-2">
                <PaperCard card={s.closestMiss} briefId={view.id} />
              </div>
            </details>
          )}
        </section>
      ))}

      {view.sections.length === 0 && <p className="mt-8 text-sm text-muted">No domains were processed in this brief.</p>}
    </div>
  );
}
