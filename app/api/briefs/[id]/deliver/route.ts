import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Mark a preview brief as delivered without emailing (its papers won't appear in later briefs). */
export async function POST(_req: Request, ctx: RouteContext<"/api/briefs/[id]/deliver">) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Brief not found", 404);
  const row = await q1("update briefs set status = 'delivered' where id = $1 returning id, status", [id]);
  if (!row) return jsonError("Brief not found", 404);
  return NextResponse.json(row);
}
