import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { parseBody, jsonError } from "@/lib/http";
import { getSettings } from "@/lib/repo";
import { settingsInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: await getSettings() });
}

export async function PATCH(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = await parseBody(req, settingsInput);
  if ("response" in parsed) return parsed.response;
  await getSettings(); // ensures the row exists
  const data = { ...parsed.data } as Record<string, unknown>;
  if (data.recipient_email === "") data.recipient_email = null;
  if (data.client_lens === "") data.client_lens = null;
  const keys = Object.keys(data).filter((k) => data[k] !== undefined);
  if (!keys.length) return jsonError("Nothing to update", 400);
  const sets = keys.map((k, i) => (k === "sources" ? `${k} = $${i + 1}::jsonb` : `${k} = $${i + 1}`)).join(", ");
  const values = keys.map((k) => (k === "sources" ? JSON.stringify(data[k]) : data[k]));
  await q(`update settings set ${sets}, updated_at = now() where id = 1`, values);
  return NextResponse.json({ settings: await getSettings() });
}
