import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);
  const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  // Strip comments, then run statement by statement (the HTTP driver takes one statement per call).
  const statements = schema
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) await sql.query(stmt);
  console.log(`Applied ${statements.length} statements.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
