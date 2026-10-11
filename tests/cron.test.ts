import { afterEach, describe, expect, it, vi } from "vitest";

// The route must reject before touching the database, so stub the DB-backed modules.
vi.mock("@/lib/repo", () => ({ getSettings: vi.fn(() => Promise.reject(new Error("DB should not be called"))) }));
vi.mock("@/lib/pipeline", () => ({ executeRun: vi.fn() }));
vi.mock("@/lib/runs", () => ({ activeRun: vi.fn(), createRun: vi.fn(), logSkippedRun: vi.fn() }));
vi.mock("@/lib/db", () => ({ q1: vi.fn() }));

import { GET } from "@/app/api/cron/weekly-brief/route";
import { isAuthorizedCron } from "@/lib/cron";

const req = (auth?: string) => new Request("http://localhost/api/cron/weekly-brief", { headers: auth ? { authorization: auth } : {} });

describe("cron route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns 401 without the secret", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await GET(req())).status).toBe(401);
  });

  it("returns 401 with the wrong secret", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await GET(req("Bearer nope"))).status).toBe(401);
  });

  it("refuses everything when CRON_SECRET is unset", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCron(req("Bearer "))).toBe(false);
  });

  it("accepts the correct bearer token", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCron(req("Bearer s3cret"))).toBe(true);
  });
});
