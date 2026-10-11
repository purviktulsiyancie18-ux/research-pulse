import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { q1 } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/http";
import { feedbackInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** Upsert feedback for (paper, domain). Fields omitted from the body keep their current value. */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = await parseBody(req, feedbackInput);
  if ("response" in parsed) return parsed.response;
  const f = parsed.data;
  const paper = await q1("select 1 from papers where arxiv_id = $1", [f.arxivId]);
  if (!paper) return jsonError("Paper not found", 404);
  const row = await q1(
    `insert into feedback (arxiv_id, domain_id, brief_id, verdict, starred, note, client_tag)
     values ($1, $2, $3, $4, coalesce($5, false), $6, $7)
     on conflict (arxiv_id, domain_id) do update set
       brief_id = coalesce(excluded.brief_id, feedback.brief_id),
       verdict = case when $8 then excluded.verdict else feedback.verdict end,
       starred = coalesce($5, feedback.starred),
       note = case when $9 then excluded.note else feedback.note end,
       client_tag = case when $10 then excluded.client_tag else feedback.client_tag end,
       updated_at = now()
     returning arxiv_id, domain_id, verdict, starred, note, client_tag`,
    [
      f.arxivId,
      f.domainId,
      f.briefId ?? null,
      f.verdict ?? null,
      f.starred ?? null,
      f.note ?? null,
      f.clientTag ?? null,
      f.verdict !== undefined,
      f.note !== undefined,
      f.clientTag !== undefined,
    ],
  );
  return NextResponse.json({ feedback: row });
}
