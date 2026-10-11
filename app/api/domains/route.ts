import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/http";
import { getDomains, toDomain } from "@/lib/repo";
import { domainInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ domains: await getDomains() });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = await parseBody(req, domainInput);
  if ("response" in parsed) return parsed.response;
  const d = parsed.data;
  try {
    // Re-adding a deleted (archived) domain with the same name restores it.
    const revived = await q1(
      `update domains set description = $2, keywords = $3, categories = $4, exclude_keywords = $5, priority = $6,
         papers_per_domain = $7, active = $8, archived = false, updated_at = now()
       where lower(name) = lower($1) and archived returning *`,
      [d.name, d.description, d.keywords, d.categories, d.exclude_keywords, d.priority, d.papers_per_domain, d.active],
    );
    if (revived) return NextResponse.json({ domain: toDomain(revived) }, { status: 201 });
    const row = await q1(
      `insert into domains (name, description, keywords, categories, exclude_keywords, priority, papers_per_domain, active)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
      [d.name, d.description, d.keywords, d.categories, d.exclude_keywords, d.priority, d.papers_per_domain, d.active],
    );
    return NextResponse.json({ domain: toDomain(row!) }, { status: 201 });
  } catch (e) {
    if (/unique|duplicate/i.test((e as Error).message)) return jsonError("A domain with that name already exists", 409);
    throw e;
  }
}
