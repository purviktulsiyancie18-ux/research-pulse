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
