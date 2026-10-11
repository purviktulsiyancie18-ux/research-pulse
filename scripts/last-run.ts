// Prints the latest run's status, progress and timing.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
sql.query("select status, progress, error, brief_id, stats - 'calls' as stats, extract(epoch from (coalesce(finished_at, now()) - started_at))::int as secs from runs order by started_at desc limit 1")
  .then((r) => console.log(JSON.stringify(r[0])));
