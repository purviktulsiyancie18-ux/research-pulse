import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { q1 } from "@/lib/db";
import { executeRun } from "@/lib/pipeline";
import { getSettings } from "@/lib/repo";
import { activeRun, createRun, logSkippedRun } from "@/lib/runs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSettings();
  if (settings.delivery_paused) {
    await logSkippedRun("Delivery paused in Settings");
    return NextResponse.json({ skipped: true, reason: "delivery_paused" });
  }
  const running = await activeRun();
  if (running) return NextResponse.json({ error: "A run is already in progress", runId: running }, { status: 409 });

  const runId = await createRun({ trigger: "cron", mode: "since_last_brief", sendEmail: true });
  await executeRun(runId);
  const run = await q1<{ status: string; brief_id: string | null }>("select status, brief_id from runs where id = $1", [runId]);
  return NextResponse.json({ runId, status: run?.status, briefId: run?.brief_id });
}
