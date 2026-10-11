import { after, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/http";
import { executeRun } from "@/lib/pipeline";
import { getSettings } from "@/lib/repo";
import { activeRun, cooldownRemaining, createRun } from "@/lib/runs";
import { WindowError } from "@/lib/window";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  mode: z.enum(["since_last_brief", "last_n_days", "custom"]).default("since_last_brief"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  domainIds: z.array(z.number().int().positive()).optional(),
  sendEmail: z.boolean().optional(),
});

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = await parseBody(req, bodySchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const running = await activeRun();
  if (running) return jsonError("A run is already in progress", 409, { runId: running });

  const settings = await getSettings();
  const wait = await cooldownRemaining(settings.refresh_cooldown_minutes);
  if (wait > 0)
    return NextResponse.json(
      { error: `Please wait ${wait}s before refreshing again`, retryAfter: wait },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );

  let runId: string;
  try {
    runId = await createRun({
      trigger: "manual",
      mode: body.mode,
      from: body.from,
      to: body.to,
      domainIds: body.domainIds,
      sendEmail: body.sendEmail ?? settings.email_manual_refresh_default,
    });
  } catch (e) {
    if (e instanceof WindowError) return jsonError(e.message, 400);
    return jsonError((e as Error).message, 400);
  }

  after(() => executeRun(runId));
  return NextResponse.json({ runId }, { status: 202 });
}

export async function GET() {
  const runs = await q(
    `select id, trigger, mode, window_start, window_end, status, stats, error, brief_id, started_at, finished_at
     from runs order by started_at desc limit 50`,
  );
  return NextResponse.json({ runs });
}
