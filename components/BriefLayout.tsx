import { BookOpen } from "lucide-react";
import { getBriefView, type BriefView as View } from "@/lib/brief";
import { effectiveThreshold } from "@/lib/ranking";
import { getDomains, getSettings, recipientFor } from "@/lib/repo";
import { activeRun } from "@/lib/runs";
import { BriefView } from "./BriefView";
import { RefreshPanel } from "./RefreshPanel";
import { TopicNav, type TopicLink } from "./TopicNav";
import { TrendsStrip } from "./TrendsStrip";

function topicLinks(view: View): TopicLink[] {
  return view.sections.map((s) => ({
    id: s.domain.id,
    name: s.domain.name,
    caption: s.notice ? "Could not process" : s.cards.length ? `${s.cards.length} paper${s.cards.length === 1 ? "" : "s"}` : "Quiet week",
    failed: Boolean(s.notice),
  }));
}

/** Brief page shell: reading column + right-hand aside (meter card, then a sticky dock). */
export async function BriefLayout({ briefId, showBack = false }: { briefId: string | null; showBack?: boolean }) {
  const [settings, domains, running] = await Promise.all([getSettings(), getDomains(), activeRun()]);
  const view = briefId ? await getBriefView(briefId) : null;

  const refresh = (
    <RefreshPanel
      domains={domains.map((d) => ({ id: d.id, name: d.name, active: d.active }))}
      lookbackDays={settings.lookback_days}
      emailDefault={settings.email_manual_refresh_default}
      activeRunId={running}
    />
  );

  return (
    <div className="flex flex-wrap-reverse justify-center gap-6">
      <div className="min-w-0 max-w-reading" style={{ flex: "1 1 420px" }}>
        {view ? (
          <BriefView view={view} passMark={effectiveThreshold(settings)} recipient={recipientFor(settings)} showBack={showBack} />
        ) : (
          <div className="card flex flex-col items-center bg-wash py-14 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-white">
              <BookOpen size={26} />
            </span>
            <h1 className="h1 mt-4">No briefs yet</h1>
            <p className="mt-2 max-w-sm text-[15px] text-body">Click Refresh to generate your first brief from this week&apos;s arXiv papers.</p>
            <p className="mt-4 text-[13px] text-muted-text">Use the Refresh now panel {"→"}</p>
          </div>
        )}
      </div>

      <aside className="flex w-full flex-col gap-4 self-stretch min-[800px]:max-w-[272px]" style={{ flex: "1 1 248px" }}>
        <TrendsStrip briefId={view?.id ?? null} paused={settings.delivery_paused} />
        <div className="flex-1">
          <div className="flex flex-col gap-3 min-[800px]:sticky min-[800px]:top-[92px]">
            {refresh}
            {view && view.sections.length > 0 && <TopicNav topics={topicLinks(view)} />}
          </div>
        </div>
      </aside>
    </div>
  );
}
