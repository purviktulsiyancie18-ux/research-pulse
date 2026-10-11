// Usage: npx tsx scripts/run-once.ts [domainId ...]  — runs the pipeline locally (preview, no email).
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { createRun } = await import("../lib/runs");
  const { executeRun } = await import("../lib/pipeline");
  const { q1 } = await import("../lib/db");
  const domainIds = process.argv.slice(2).map(Number).filter(Boolean);
  const runId = await createRun({ trigger: "manual", mode: "last_n_days", domainIds, sendEmail: false });
  console.log("run", runId);
  const t = Date.now();
  await executeRun(runId);
  const run = await q1<Record<string, unknown>>("select status, brief_id, stats, error, progress from runs where id = $1", [runId]);
  const { calls, ...stats } = (run?.stats ?? {}) as Record<string, unknown>;
  console.log(JSON.stringify({ status: run?.status, error: run?.error, brief: run?.brief_id, progress: run?.progress, stats, calls }, null, 1));
  console.log(`took ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); });
