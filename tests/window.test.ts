import { describe, expect, it } from "vitest";
import { computeWindow, WindowError } from "@/lib/window";

const now = new Date("2026-10-12T00:30:00Z"); // Monday 6:00 AM IST
const DAY = 86_400_000;

describe("computeWindow", () => {
  it("last_n_days uses the lookback setting", () => {
    const w = computeWindow({ mode: "last_n_days", now, lookbackDays: 7 });
    expect(w.end).toEqual(now);
    expect(now.getTime() - w.start.getTime()).toBe(7 * DAY);
  });

  it("since_last_brief with no prior brief falls back to the lookback", () => {
    const w = computeWindow({ mode: "since_last_brief", now, lookbackDays: 7, lastDeliveredEnd: null });
    expect(now.getTime() - w.start.getTime()).toBe(7 * DAY);
  });

  it("since_last_brief starts where the last delivered brief ended", () => {
    const last = new Date("2026-10-05T00:40:00Z");
    expect(computeWindow({ mode: "since_last_brief", now, lookbackDays: 7, lastDeliveredEnd: last }).start).toEqual(last);
  });

  it("a paused week is covered automatically (window spans two weeks)", () => {
    const last = new Date("2026-09-28T00:40:00Z");
    const w = computeWindow({ mode: "since_last_brief", now, lookbackDays: 7, lastDeliveredEnd: last });
    expect(w.start).toEqual(last);
    expect((w.end.getTime() - w.start.getTime()) / DAY).toBeGreaterThan(13);
  });

  it("since_last_brief is capped at 31 days", () => {
    const w = computeWindow({ mode: "since_last_brief", now, lookbackDays: 7, lastDeliveredEnd: new Date("2026-01-01T00:00:00Z") });
    expect(now.getTime() - w.start.getTime()).toBe(31 * DAY);
  });

  it("custom covers whole UTC days and clamps the end to now", () => {
    const w = computeWindow({ mode: "custom", now, lookbackDays: 7, from: "2026-10-01", to: "2026-10-20" });
    expect(w.start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(w.end).toEqual(now);
  });

  it("custom rejects bad ranges", () => {
    expect(() => computeWindow({ mode: "custom", now, lookbackDays: 7, from: "2026-10-10", to: "2026-10-01" })).toThrow(WindowError);
    expect(() => computeWindow({ mode: "custom", now, lookbackDays: 7, from: "2026-08-01", to: "2026-10-01" })).toThrow(/31 days/);
    expect(() => computeWindow({ mode: "custom", now, lookbackDays: 7 })).toThrow(WindowError);
  });
});
