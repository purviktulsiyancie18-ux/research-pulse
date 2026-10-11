import { q, q1 } from "./db";
import { getDomains, getSettings, isTestMode } from "./repo";
import { computeWindow } from "./window";
import type { RunMode, RunTrigger } from "./types";

const LOCK_MS = 6 * 60 * 1000;

export async function lastDeliveredEnd(): Promise<Date | null> {
  const r = await q1<{ window_end: string }>(
    "select window_end from briefs where status = 'delivered' order by window_end desc limit 1",
  );
  return r ? new Date(r.window_end) : null;
}

/** A run that is still `running`/`queued` and started < 6 min ago blocks new runs. */
export async function activeRun(): Promise<string | null> {
  const r = await q1<{ id: string }>(
    `select id from runs where status in ('queued','running') and started_at > now() - ($1 || ' milliseconds')::interval
     order by started_at desc limit 1`,
    [String(LOCK_MS)],
  );
  return r?.id ?? null;
}

/** Seconds left on the manual-refresh cooldown (0 when allowed). Disabled in TEST_MODE. */
export async function cooldownRemaining(cooldownMinutes: number): Promise<number> {
  if (isTestMode() || cooldownMinutes <= 0) return 0;
  const r = await q1<{ started_at: string }>(
    "select started_at from runs where trigger = 'manual' order by started_at desc limit 1",
  );
  if (!r) return 0;
  const left = new Date(r.started_at).getTime() + cooldownMinutes * 60_000 - Date.now();
  return Math.max(0, Math.ceil(left / 1000));
}

export interface CreateRunInput {
  trigger: RunTrigger;
  mode: RunMode;
  from?: string;
  to?: string;
  domainIds?: number[];
  sendEmail: boolean;
}

export async function createRun(input: CreateRunInput) {
  const settings = await getSettings();
  const active = await getDomains({ activeOnly: true });
  const all = await getDomains();
  const ids = input.domainIds?.length
    ? all.filter((d) => input.domainIds!.includes(d.id)).map((d) => d.id)
    : active.map((d) => d.id);
  if (!ids.length) throw new Error("No domains selected — add or activate a domain in Settings.");

  const { start, end } = computeWindow({
    mode: input.mode,
    now: new Date(),
    lookbackDays: settings.lookback_days,
    lastDeliveredEnd: input.mode === "since_last_brief" ? await lastDeliveredEnd() : null,
    from: input.from,
    to: input.to,
  });
  const progress = Object.fromEntries(ids.map((id) => [id, "queued"]));
  const run = await q1<{ id: string }>(
    `insert into runs (trigger, mode, window_start, window_end, domain_ids, send_email, progress)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb) returning id`,
    [input.trigger, input.mode, start.toISOString(), end.toISOString(), ids, input.sendEmail, JSON.stringify(progress)],
  );
  return run!.id;
}

export async function logSkippedRun(reason: string) {
  const now = new Date().toISOString();
  await q(
    `insert into runs (trigger, mode, window_start, window_end, domain_ids, status, error, finished_at)
     values ('cron', 'since_last_brief', $1, $1, '{}', 'skipped', $2, now())`,
    [now, reason],
  );
}
