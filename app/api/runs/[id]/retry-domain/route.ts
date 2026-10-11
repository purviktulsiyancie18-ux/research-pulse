import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError, parseBody } from "@/lib/http";
import { retryDomain } from "@/lib/pipeline";
import { activeRun } from "@/lib/runs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request, ctx: RouteContext<"/api/runs/[id]/retry-domain">) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const parsed = await parseBody(req, z.object({ domainId: z.number().int().positive() }));
  if ("response" in parsed) return parsed.response;
  const running = await activeRun();
  if (running) return jsonError("A run is already in progress", 409, { runId: running });
  try {
    await retryDomain(id, parsed.data.domainId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError((e as Error).message, 500);
  }
}
