import { NextResponse } from "next/server";
import { getBriefView } from "@/lib/brief";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/briefs/[id]">) {
  const { id } = await ctx.params;
  const view = await getBriefView(id);
  if (!view) return jsonError("Brief not found", 404);
  return NextResponse.json(view);
}
