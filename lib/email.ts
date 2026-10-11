import { Resend } from "resend";
import { q, q1 } from "./db";
import { authorLine, briefSubject, briefToMarkdown, fmtDate, getBriefView, statsLine, type BriefView, type Card } from "./brief";
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

const VERDICT_STYLE: Record<string, string> = {
  READ: "color:#ffffff;background:#2563EB",
  CLIENT: "color:#0F766E;background:#DDF4F1",
  FYI: "color:#0369A1;background:#E0F2FB",
};

function cardHtml(c: Card) {
  const e = escapeHtml;
  const badge = c.verdict
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;letter-spacing:.04em;${VERDICT_STYLE[c.verdict]}">${c.verdict}</span>`
    : `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;color:#B45309;background:#FEF0D7">AI summary unavailable</span>`;
  const row = (label: string, v: string | null) =>
    v ? `<p style="margin:6px 0;font-size:15px;line-height:1.6;color:#444B6B"><strong style="color:#151A33">${label}:</strong> ${e(v)}</p>` : "";
  const links = [
    `<a href="${e(c.absUrl)}" style="color:#2563EB;font-weight:600">arXiv</a>`,
    c.pdfUrl ? `<a href="${e(c.pdfUrl)}" style="color:#2563EB;font-weight:600">PDF</a>` : "",
    c.codeUrl ? `<a href="${e(c.codeUrl)}" style="color:#2563EB;font-weight:600">Code</a>` : "",
  ]
    .filter(Boolean)
    .join(" &middot; ");
  return `
  <div style="border:1px solid #E2E8F3;border-radius:16px;padding:18px 20px;margin:14px 0;background:#ffffff">
    <div style="font-size:12px;color:#6B7394;margin-bottom:8px">${badge} &nbsp;<strong style="color:#151A33">Score ${c.score.toFixed(1)}/10</strong> &middot; ${e(fmtDate(c.publishedAt))}</div>
    <a href="${e(c.absUrl)}" style="font-size:17px;font-weight:700;color:#151A33;text-decoration:none;line-height:1.4">${e(c.title)}</a>
    <p style="margin:4px 0 10px;font-size:13px;color:#6B7394">${e(authorLine(c.authors))}${c.affiliations.length ? ` &middot; ${e(c.affiliations.join(", "))}` : ""}</p>
    ${row("Summary", c.summary)}
    ${row("Key finding", c.keyFinding)}
    ${row("Why it matters", c.whyItMatters)}
    ${row("Client angle", c.clientAngle)}
    ${row("Method", c.method)}
    ${row("Limitations", c.limitations)}
    ${c.chips.length ? `<p style="margin:10px 0 4px;font-size:12px;color:#6B7394">Why ranked: ${c.chips.map(e).join(" &middot; ")}</p>` : ""}
    ${c.alsoRelevantTo.length ? `<p style="margin:4px 0;font-size:12px;color:#6B7394">Also relevant to: ${e(c.alsoRelevantTo.join(", "))}</p>` : ""}
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
        : `<p style="font-size:14px;color:#6B7394;background:#F7F9FD;border-radius:12px;padding:12px 16px">${s.notice ? e(s.notice) : "Quiet week — nothing scored above your pass mark."}${
            s.closestMiss ? `<br>Closest miss: <a href="${e(s.closestMiss.absUrl)}" style="color:#2563EB">${e(s.closestMiss.title)}</a>` : ""
          }</p>`;
      return `
      <h2 style="font-size:20px;font-weight:800;color:#151A33;margin:32px 0 4px;border-bottom:2px solid #DCE7FB;padding-bottom:6px">${e(s.domain.name)}</h2>
      ${s.headline && s.cards.length ? `<p style="font-size:14px;color:#444B6B;margin:6px 0">${e(s.headline)}</p>` : ""}
      ${body}`;
    })
    .join("");
  const notices = v.notices
    .map((n) => `<p style="margin:8px 0;padding:12px 16px;background:#FEF5E6;border:1px solid #FBD99B;border-radius:12px;font-size:13px;color:#92400E">${e(n)}</p>`)
    .join("");

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F3F6FC">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#444B6B">
    <p style="font-size:12px;letter-spacing:.08em;font-weight:800;margin:0"><span style="color:#13284F">RESEARCH</span> <span style="color:#1A6FE8">PULSE</span></p>
    <h1 style="font-size:28px;font-weight:800;letter-spacing:-0.02em;color:#151A33;margin:6px 0 2px">Week of ${e(fmtDate(v.windowEnd))}</h1>
    <p style="font-size:13px;color:#6B7394;margin:0 0 16px">${e(fmtDate(v.windowStart))} – ${e(fmtDate(v.windowEnd))} &middot; ${e(statsLine(v))} &middot; ~${v.readingMinutes ?? "?"} min read</p>
    ${v.headline ? `<p style="font-size:16px;font-weight:600;line-height:1.55;color:#151A33;background:#EAF0FD;border:1px solid #C3D4FA;padding:16px 18px;border-radius:16px">${e(v.headline)}</p>` : ""}
    <p style="font-size:12px;color:#6B7394;margin:10px 0">Verdicts: <strong>READ</strong> = read in full &middot; <strong>CLIENT</strong> = bring to a client &middot; <strong>FYI</strong> = for your information. Scores are out of 10.</p>
    ${notices}
    ${sections}
    <hr style="border:none;border-top:1px solid #E2E8F3;margin:32px 0 14px">
    <p style="font-size:13px;color:#6B7394">
      <a href="${url}/briefs/${v.id}" style="color:#2563EB;font-weight:700">Open in Research Pulse</a> to mark papers Read / Bring to client / Not useful
      &middot; <a href="${url}/settings" style="color:#2563EB">Manage domains</a>
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
