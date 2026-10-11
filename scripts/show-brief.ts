// Usage: npx tsx scripts/show-brief.ts [briefId] — prints a brief as Markdown (latest if omitted).
import { config } from "dotenv";
config({ path: ".env.local" });
async function main() {
  const { getBriefView, latestBriefId, briefToMarkdown } = await import("../lib/brief");
  const id = process.argv[2] || (await latestBriefId());
  if (!id) return console.log("No briefs yet");
  const v = await getBriefView(id);
  console.log(v ? briefToMarkdown(v) : "Not found");
}
main().catch((e) => { console.error(e); process.exit(1); });
