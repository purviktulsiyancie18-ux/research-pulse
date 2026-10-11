import { NextResponse } from "next/server";
import type { z } from "zod";

export function jsonError(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Parse a JSON body with zod; returns either data or a 400 response. */
export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<{ data: T } | { response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return { response: jsonError(msg, 400) };
  }
  return { data: parsed.data };
}
