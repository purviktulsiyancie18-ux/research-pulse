import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { fetchDomainPapers } from "@/lib/arxiv";
import { jsonError } from "@/lib/http";
import { getDomain } from "@/lib/repo";
import { domainInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * arXiv-only test of a domain query over the last 7 days (no Gemini).
 * The body may carry unsaved form values so keywords can be tuned before saving.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/domains/[id]/preview">) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const draft = domainInput
    .pick({ keywords: true, categories: true, exclude_keywords: true })
    .partial()
    .safeParse(await req.json().catch(() => ({})));
  const saved = id === "new" ? null : await getDomain(Number(id));
  if (id !== "new" && !saved) return jsonError("Domain not found", 404);
  const d = {
    keywords: (draft.success && draft.data.keywords) || saved?.keywords || [],
    categories: (draft.success && draft.data.categories) || saved?.categories || [],
    exclude_keywords: (draft.success && draft.data.exclude_keywords) || saved?.exclude_keywords || [],
  };
  if (!d.keywords.length && !d.categories.length) return jsonError("Add keywords or categories first", 400);
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
  try {
    const res = await fetchDomainPapers(d, start, end);
    return NextResponse.json({
      count: res.papers.length,
      capped: res.papers.length >= 200,
      titles: res.papers.slice(0, 5).map((p) => ({ title: p.title, url: p.abs_url })),
    });
  } catch (e) {
    return jsonError(`arXiv error: ${(e as Error).message}`, 502);
  }
}
