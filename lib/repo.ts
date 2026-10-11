import { q, q1 } from "./db";
import type { Domain, Settings } from "./types";

type Row = Record<string, unknown>;

export function toSettings(r: Row): Settings {
  const sources = (r.sources ?? {}) as Partial<Settings["sources"]>;
  return {
    recipient_email: (r.recipient_email as string | null) ?? null,
    papers_per_domain: Number(r.papers_per_domain ?? 4),
    significance_threshold: Number(r.significance_threshold ?? 5),
    ranking_style: (r.ranking_style as Settings["ranking_style"]) ?? "balanced",
    reading_minutes: Number(r.reading_minutes ?? 10),
    lookback_days: Number(r.lookback_days ?? 7),
    detail_level: (r.detail_level as Settings["detail_level"]) ?? "standard",
    client_lens: (r.client_lens as string | null) || null,
    watchlist_authors: (r.watchlist_authors as string[]) ?? [],
    watchlist_orgs: (r.watchlist_orgs as string[]) ?? [],
    watchlist_terms: (r.watchlist_terms as string[]) ?? [],
    sources: {
      semantic_scholar: sources.semantic_scholar !== false,
      huggingface: sources.huggingface !== false,
    },
    delivery_paused: Boolean(r.delivery_paused),
    refresh_cooldown_minutes: Number(r.refresh_cooldown_minutes ?? 10),
    email_manual_refresh_default: Boolean(r.email_manual_refresh_default),
  };
}

export async function getSettings(): Promise<Settings> {
  let row = await q1<Row>("select * from settings where id = 1");
  if (!row) {
    await q("insert into settings (id, recipient_email) values (1, $1) on conflict (id) do nothing", [
      process.env.DEFAULT_RECIPIENT || null,
    ]);
    row = await q1<Row>("select * from settings where id = 1");
  }
  return toSettings(row ?? {});
}

export function toDomain(r: Row): Domain {
  return {
    id: Number(r.id),
    name: String(r.name),
    description: String(r.description ?? ""),
    keywords: (r.keywords as string[]) ?? [],
    categories: (r.categories as string[]) ?? [],
    exclude_keywords: (r.exclude_keywords as string[]) ?? [],
    priority: (r.priority as Domain["priority"]) ?? "normal",
    papers_per_domain: r.papers_per_domain == null ? null : Number(r.papers_per_domain),
    active: Boolean(r.active),
  };
}

const PRIORITY_ORDER = "case priority when 'high' then 0 when 'normal' then 1 else 2 end";

export async function getDomains(opts: { activeOnly?: boolean } = {}): Promise<Domain[]> {
  const rows = await q<Row>(
    `select * from domains ${opts.activeOnly ? "where active" : ""} order by ${PRIORITY_ORDER}, name`,
  );
  return rows.map(toDomain);
}

export async function getDomain(id: number): Promise<Domain | null> {
  const r = await q1<Row>("select * from domains where id = $1", [id]);
  return r ? toDomain(r) : null;
}

/** Where the brief is emailed. In TEST_MODE it always goes to DEFAULT_RECIPIENT. */
export function recipientFor(settings: Settings): string | null {
  if (process.env.TEST_MODE === "true") return process.env.DEFAULT_RECIPIENT || null;
  return settings.recipient_email || process.env.DEFAULT_RECIPIENT || null;
}

export function isTestMode() {
  return process.env.TEST_MODE === "true";
}
