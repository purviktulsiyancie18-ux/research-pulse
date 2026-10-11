import { ArrowLeft, CircleCheck, Moon, Sparkles } from "lucide-react";
import Link from "next/link";
import { briefToMarkdown, fmtDate, statsLine, type BriefView as View } from "@/lib/brief";
import { appUrl } from "@/lib/email";
import { TIPS } from "@/lib/glossary";
import { BriefActions } from "./BriefActions";
import { ClosestMiss } from "./ClosestMiss";
import { InfoTip } from "./InfoTip";
import { PaperCard } from "./PaperCard";
import { DomainIcon, Notice, StatusBadge } from "./ui";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function BriefView({
  view,
  passMark,
  recipient,
  showBack = false,
}: {
  view: View;
  passMark: number;
  recipient: string | null;
  showBack?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {showBack && (
        <Link href="/briefs" data-noprint className="btn btn-sm self-start border border-line bg-surface text-body shadow-pill hover:text-heading">
          <ArrowLeft size={15} /> Archive
        </Link>
      )}

      {/* Header card */}
      <section className="card">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status={view.status} />
          <InfoTip text={view.status === "delivered" ? `Delivered: ${TIPS.delivered}` : `Preview: ${TIPS.preview}`} align="left" />
          <span className="text-[12px] text-muted-text">Last updated {fmtTime(view.createdAt)} IST</span>
          {view.emailedAt && (
            <span className="pill ml-auto bg-success/12 font-semibold text-success-ink" title={`Counted as delivered. ${TIPS.delivered}`}>
              <CircleCheck size={13} strokeWidth={2.25} /> Emailed {fmtTime(view.emailedAt)}
            </span>
          )}
        </div>
        <h1 className="h-display mt-2">Week of {fmtDate(view.windowEnd)}</h1>
        <p className="mt-1 text-[14px] leading-[22px] text-muted-text">
          {fmtDate(view.windowStart)} – {fmtDate(view.windowEnd)} · {statsLine(view)} · ~{view.readingMinutes ?? "?"} min read
        </p>
        <BriefActions briefId={view.id} status={view.status} emailedAt={view.emailedAt} markdown={briefToMarkdown(view, appUrl())} recipient={recipient} />
      </section>

      {/* Headline of the week */}
      {view.headline && (
        <section className="rounded-card border border-primary/25 bg-surface bg-wash shadow-card" style={{ padding: "clamp(20px,4vw,32px)" }}>
          <p className="flex items-center gap-2 font-display text-[12px] font-bold tracking-[0.06em] text-primary-hover uppercase">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-white">
              <Sparkles size={14} />
            </span>
            Headline of the week
          </p>
          <p className="mt-3 font-display font-semibold text-heading" style={{ fontSize: "clamp(18px,2.6vw,21px)", lineHeight: 1.55 }}>
            {view.headline}
          </p>
        </section>
      )}

      {view.notices.map((n) => (
        <Notice key={n}>{n}</Notice>
      ))}

      {view.sections.map((s) => {
        const count = s.cards.length;
        return (
          <section key={s.domain.id} id={`d-${s.domain.id}`} data-topic={s.domain.id} className="mt-4 flex scroll-mt-[88px] flex-col gap-6">
            <div className="card">
              <div className="flex items-start gap-4">
                <DomainIcon id={s.domain.id} name={s.domain.name} />
                <div className="min-w-0">
                  <h2 className="h2">
                    {s.domain.name}{" "}
                    <span className="align-middle font-sans text-[13px] font-medium tracking-normal text-muted-text">
                      {count} paper{count === 1 ? "" : "s"}
                    </span>
                  </h2>
                  {s.headline && count > 0 && (
                    <p className="mt-1 text-[15px] leading-6 text-body">
                      <strong className="font-semibold text-heading">This week:</strong> {s.headline}
                    </p>
                  )}
                </div>
              </div>

              {s.notice && (
                <div className="mt-4">
                  <Notice tone="error">
                    {s.notice.replace(/Retry this domain from Run history\.?$/, "")}
                    <Link href="/runs" className="font-semibold underline underline-offset-2">
                      Retry this domain from Run history.
                    </Link>
                  </Notice>
                </div>
              )}

              {!count && !s.notice && (
                <div className="panel mt-4 px-5 py-4">
                  <p className="flex items-center gap-2.5 text-[15px] text-body">
                    <Moon size={18} className="text-muted-text" /> Quiet week — nothing scored above your pass mark.
                  </p>
                  {s.closestMiss && (
                    <ClosestMiss
                      score={s.closestMiss.score}
                      passMark={passMark}
                      title={s.closestMiss.title}
                      url={s.closestMiss.absUrl}
                      summary={s.closestMiss.summary}
                    />
                  )}
                </div>
              )}
            </div>

            {s.cards.map((c) => (
              <PaperCard key={c.arxivId} card={c} briefId={view.id} topPick={c.arxivId === view.topPickId} />
            ))}
          </section>
        );
      })}

      {view.sections.length === 0 && <p className="text-[14px] text-muted-text">No domains were processed in this brief.</p>}
    </div>
  );
}
