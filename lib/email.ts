import { Resend } from "resend";
import { q, q1 } from "./db";
import { authorLine, briefSubject, briefToMarkdown, fmtDate, getBriefView, statsLine, type BriefView, type Card } from "./brief";
import { explainChip, VERDICT_LABELS } from "./glossary";
import { getSettings, recipientFor } from "./repo";

export function escapeHtml(s: string | null | undefined) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

const VERDICT_COLORS: Record<string, string> = { READ: "#1d4ed8", CLIENT: "#15803d", FYI: "#6b7280" };

function cardHtml(c: Card) {
  const e = escapeHtml;
  const badge = c.verdict
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;background:${VERDICT_COLORS[c.verdict]}">${c.verdict}</span> <span style="font-style:italic">(${VERDICT_LABELS[c.verdict]})</span>`
    : `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;color:#92400e;background:#fef3c7">AI summary unavailable</span>`;
  const row = (label: string, v: string | null) =>
    v ? `<p style="margin:6px 0;font-size:14px;line-height:1.5;color:#1f2937"><strong>${label}:</strong> ${e(v)}</p>` : "";
  const links = [
    `<a href="${e(c.absUrl)}" style="color:#1d4ed8">arXiv</a>`,
    c.pdfUrl ? `<a href="${e(c.pdfUrl)}" style="color:#1d4ed8">PDF</a>` : "",
    c.codeUrl ? `<a href="${e(c.codeUrl)}" style="color:#1d4ed8">Code</a>` : "",
  ]
    .filter(Boolean)
    .join(" &middot; ");
  return `
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:12px 0;background:#ffffff">
    <div style="font-size:12px;color:#6b7280;margin-bottom:6px">${badge} &nbsp;Score ${c.score.toFixed(1)}/10 &middot; ${e(fmtDate(c.publishedAt))}</div>
    <a href="${e(c.absUrl)}" style="font-size:16px;font-weight:700;color:#111827;text-decoration:none;line-height:1.35">${e(c.title)}</a>
    <p style="margin:4px 0 8px;font-size:12px;color:#6b7280">${e(authorLine(c.authors))}${c.affiliations.length ? ` &middot; ${e(c.affiliations.join(", "))}` : ""}</p>
    ${row("Summary (what they did)", c.summary)}
    ${row("Key finding (main result)", c.keyFinding)}
    ${row("Why it matters (for a strategy consultant)", c.whyItMatters)}
    ${row("Client angle (what it means for a business)", c.clientAngle)}
    ${row("Method (how they did it)", c.method)}
    ${row("Limitations (weak spots)", c.limitations)}
    ${c.chips.length ? `<p style="margin:8px 0 4px;font-size:12px;color:#4b5563">Why ranked (reasons for the score): ${c.chips.map((x) => e(explainChip(x))).join(" &middot; ")}</p>` : ""}
    ${c.alsoRelevantTo.length ? `<p style="margin:4px 0;font-size:12px;color:#6b7280">Also relevant to: ${e(c.alsoRelevantTo.join(", "))}</p>` : ""}
    <p style="margin:8px 0 0;font-size:13px">${links}</p>
  </div>`;
}

export function renderEmail(v: BriefView) {
  const e = escapeHtml;
  const url = appUrl();
  const sections = v.sections
    .map((s) => {
      const body = s.cards.length
        ? s.cards.map(cardHtml).join("")
        : `<p style="font-size:14px;color:#6b7280">${s.notice ? e(s.notice) : "Quiet week — nothing above your threshold."}${
            s.closestMiss ? `<br>Closest miss: <a href="${e(s.closestMiss.absUrl)}" style="color:#1d4ed8">${e(s.closestMiss.title)}</a>` : ""
          }</p>`;
      return `
      <h2 style="font-size:18px;color:#14532d;margin:28px 0 4px;border-bottom:2px solid #dcfce7;padding-bottom:4px">${e(s.domain.name)}</h2>
      ${s.headline && s.cards.length ? `<p style="font-size:14px;color:#374151;font-style:italic;margin:4px 0">${e(s.headline)}</p>` : ""}
      ${body}`;
    })
    .join("");
  const notices = v.notices
    .map((n) => `<p style="margin:6px 0;padding:8px 12px;background:#fef3c7;border-radius:6px;font-size:13px;color:#92400e">${e(n)}</p>`)
    .join("");

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
    <p style="font-size:12px;letter-spacing:1px;color:#15803d;font-weight:700;margin:0">RESEARCH PULSE</p>
    <h1 style="font-size:22px;color:#111827;margin:4px 0 2px">Week of ${e(fmtDate(v.windowEnd))}</h1>
    <p style="font-size:13px;color:#6b7280;margin:0 0 12px">${e(fmtDate(v.windowStart))} – ${e(fmtDate(v.windowEnd))} &middot; ${e(statsLine(v))} &middot; ~${v.readingMinutes ?? "?"} min read</p>
    ${v.headline ? `<p style="font-size:15px;line-height:1.55;color:#1f2937;background:#ffffff;border-left:4px solid #15803d;padding:12px 14px;border-radius:4px">${e(v.headline)}</p>` : ""}
    ${notices}
    ${sections}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 12px">
    <p style="font-size:13px;color:#6b7280">
      <a href="${url}/briefs/${v.id}" style="color:#1d4ed8;font-weight:600">Open in Research Pulse</a> to mark papers Read / Bring to client / Not useful
      &middot; <a href="${url}/settings" style="color:#1d4ed8">Manage domains</a>
    </p>
  </div></body></html>`;

  return { subject: briefSubject(v), html, text: briefToMarkdown(v, url) };
}

export interface SendResult {
  sent: boolean;
  alreadySent: boolean;
  messageId: string | null;
  to: string;
}

/** Email a brief via Resend. Idempotent: returns alreadySent unless force is true. */
export async function sendBrief(briefId: string, opts: { force?: boolean } = {}): Promise<SendResult> {
  const existing = await q1<{ emailed_at: string | null; email_message_id: string | null }>(
    "select emailed_at, email_message_id from briefs where id = $1",
    [briefId],
  );
  if (!existing) throw new Error("Brief not found");
  const to = recipientFor(await getSettings());
  if (!to) throw new Error("No recipient configured — set DEFAULT_RECIPIENT or the recipient email in Settings.");
  if (existing.emailed_at && !opts.force) return { sent: false, alreadySent: true, messageId: existing.email_message_id, to };
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");

  const view = await getBriefView(briefId);
  if (!view) throw new Error("Brief not found");
  const { subject, html, text } = renderEmail(view);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Research Pulse <onboarding@resend.dev>",
    to: [to],
    subject,
    html,
    text,
  });
  if (error) throw new Error(error.message);
  await q(
    `update briefs set emailed_at = now(), email_message_id = $2, status = 'delivered',
       notices = array(select n from unnest(notices) n where n not like 'Email failed:%') where id = $1`,
    [briefId, data?.id ?? null],
  );
  return { sent: true, alreadySent: false, messageId: data?.id ?? null, to };
}
