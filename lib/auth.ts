import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "rp_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function passcodeEnabled() {
  return Boolean(process.env.ADMIN_PASSCODE);
}

function sign(value: string) {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSCODE || "";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeSessionToken() {
  const issued = Date.now().toString();
  return `${issued}.${sign(issued)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [issued, sig] = token.split(".");
  if (!issued || !sig) return false;
  const expected = sign(issued);
  if (expected.length !== sig.length) return false;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  return Date.now() - Number(issued) < SESSION_MAX_AGE * 1000;
}

export function checkPasscode(input: string): boolean {
  const real = process.env.ADMIN_PASSCODE || "";
  if (!real) return true;
  const a = Buffer.from(input);
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when writes are allowed (no passcode configured, or a valid session cookie). */
export async function isAdmin(): Promise<boolean> {
  if (!passcodeEnabled()) return true;
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Returns a 401 response when the caller is not allowed to write, else null. */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: "Passcode required" }, { status: 401 });
}
