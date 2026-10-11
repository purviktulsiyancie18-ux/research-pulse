import type { RunMode } from "./types";

export const MAX_WINDOW_DAYS = 31;
const DAY = 24 * 60 * 60 * 1000;

export interface WindowInput {
  mode: RunMode;
  now: Date;
  lookbackDays: number;
  /** End of the window of the most recent *delivered* brief, if any. */
  lastDeliveredEnd?: Date | null;
  from?: string; // YYYY-MM-DD (custom)
  to?: string; // YYYY-MM-DD (custom)
}

export class WindowError extends Error {}

/**
 * since_last_brief: from the end of the last delivered brief (so a paused week is covered
 * automatically), falling back to `lookbackDays`; capped at 31 days.
 * last_n_days: the last `lookbackDays` days. custom: whole UTC days from..to, ≤ 31 days.
 */
export function computeWindow(input: WindowInput): { start: Date; end: Date } {
  const { now } = input;
  const lookback = new Date(now.getTime() - input.lookbackDays * DAY);
  if (input.mode === "last_n_days") return { start: lookback, end: now };

  if (input.mode === "since_last_brief") {
    const earliest = new Date(now.getTime() - MAX_WINDOW_DAYS * DAY);
    let start = input.lastDeliveredEnd ?? lookback;
    if (start < earliest) start = earliest;
    if (start >= now) start = lookback;
    return { start, end: now };
  }

  if (!input.from || !input.to) throw new WindowError("Custom range needs from and to dates");
  const start = new Date(`${input.from}T00:00:00Z`);
  let end = new Date(`${input.to}T23:59:59Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new WindowError("Invalid date");
  if (start > end) throw new WindowError("From date must be before To date");
  if (end > now) end = now;
  if (start > now) throw new WindowError("From date is in the future");
  if (end.getTime() - start.getTime() > MAX_WINDOW_DAYS * DAY) throw new WindowError("Custom range is limited to 31 days");
  return { start, end };
}
