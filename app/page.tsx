import Link from "next/link";
import { BriefView } from "@/components/BriefView";
import { RefreshPanel } from "@/components/RefreshPanel";
import { TrendsStrip } from "@/components/TrendsStrip";
import { getBriefView, latestBriefId } from "@/lib/brief";
import { getDomains, getSettings } from "@/lib/repo";
import { activeRun } from "@/lib/runs";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [settings, domains, briefId, running] = await Promise.all([getSettings(), getDomains(), latestBriefId(), activeRun()]);
  const view = briefId ? await getBriefView(briefId) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="order-2 lg:order-1">
        {view ? (
          <BriefView view={view} showTitleLink />
        ) : (
          <div className="card mx-auto max-w-[760px] p-10 text-center">
            <h1 className="text-xl font-bold">No briefs yet</h1>
            <p className="mt-2 text-muted">Click Refresh to generate your first brief from this week&apos;s arXiv papers.</p>
          </div>
        )}
      </div>
      <aside className="order-1 flex flex-col gap-4 lg:order-2">
        <RefreshPanel
          domains={domains.map((d) => ({ id: d.id, name: d.name, active: d.active }))}
          lookbackDays={settings.lookback_days}
          emailDefault={settings.email_manual_refresh_default}
          activeRunId={running}
        />
        <TrendsStrip />
        <div className="card no-print p-4 text-xs text-muted">
          Weekly brief is emailed automatically every Monday, 5:30–6:29 AM IST (India time).{" "}
          <Link href="/scoring" className="text-brand underline">
            How papers are scored →
          </Link>
          {settings.delivery_paused && <strong className="block text-amber-700">Delivery is paused (see Settings).</strong>}
        </div>
      </aside>
    </div>
  );
}
