import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { q, q1 } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { toDomain } from "@/lib/repo";
import { domainInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const COLUMNS = ["name", "description", "keywords", "categories", "exclude_keywords", "priority", "papers_per_domain", "active"] as const;

export async function PATCH(req: Request, ctx: RouteContext<"/api/domains/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return jsonError("Domain not found", 404);
  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = domainInput.partial().safeParse(raw);
  if (!parsed.success) return jsonError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);

  // Only update fields that were actually sent (defaults must not overwrite stored values).
  const sent = parsed.data as Record<string, unknown>;
  const fields = COLUMNS.filter((c) => c in raw && sent[c] !== undefined);
  if (!fields.length) return jsonError("Nothing to update", 400);
  const sets = fields.map((c, i) => `${c} = $${i + 2}`).join(", ");
  try {
    const row = await q1(`update domains set ${sets}, updated_at = now() where id = $1 and not archived returning *`, [
      id,
      ...fields.map((c) => sent[c]),
    ]);
    if (!row) return jsonError("Domain not found", 404);
    return NextResponse.json({ domain: toDomain(row) });
  } catch (e) {
    if (/unique|duplicate/i.test((e as Error).message)) return jsonError("A domain with that name already exists", 409);
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/domains/[id]">) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return jsonError("Domain not found", 404);
  // Archive rather than delete, so past briefs keep their papers and topic names.
  const rows = await q("update domains set archived = true, active = false, updated_at = now() where id = $1 and not archived returning id", [id]);
  if (!rows.length) return jsonError("Domain not found", 404);
  return NextResponse.json({ ok: true });
}
