import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/runs/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Run not found", 404);
  const run = await q1(
    `select id, trigger, mode, window_start, window_end, domain_ids, status, progress, stats, error, brief_id, started_at, finished_at
     from runs where id = $1`,
    [id],
  );
  if (!run) return jsonError("Run not found", 404);
  return NextResponse.json({ ...run, briefId: run.brief_id });
}
