import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPasscode, makeSessionToken, passcodeEnabled, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { jsonError, parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!passcodeEnabled()) return NextResponse.json({ ok: true, enabled: false });
  const parsed = await parseBody(req, z.object({ passcode: z.string().min(1).max(200) }));
  if ("response" in parsed) return parsed.response;
  if (!checkPasscode(parsed.data.passcode)) return jsonError("Wrong passcode", 401);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, makeSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return res;
}
