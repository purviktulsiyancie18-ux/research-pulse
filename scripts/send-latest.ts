// Usage: npx tsx scripts/send-latest.ts [briefId] — emails a brief via Resend (latest if omitted).
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
async function main() {
  const { sendBrief } = await import("../lib/email");
  const { latestBriefId } = await import("../lib/brief");
  const id = process.argv[2] || (await latestBriefId());
  if (!id) return console.log("No briefs yet");
  console.log(JSON.stringify(await sendBrief(id)));
}
main().catch((e) => { console.error("ERR", e.message); process.exit(1); });
