import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { sendBrief } from "@/lib/email";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: RouteContext<"/api/briefs/[id]/send">) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Brief not found", 404);
  const force = new URL(req.url).searchParams.get("force") === "1";
  try {
    const res = await sendBrief(id, { force });
    return NextResponse.json(res);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Brief not found") return jsonError(msg, 404);
    await q(
      "update briefs set notices = array_append(array(select n from unnest(notices) n where n not like 'Email failed:%'), $2) where id = $1",
      [id, `Email failed: ${msg.slice(0, 200)}`],
    );
    return jsonError(`Email failed: ${msg}`, 502);
  }
}
