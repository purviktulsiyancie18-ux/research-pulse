import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { neon } from "@neondatabase/serverless";

const DOMAINS = [
  {
    name: "AI Agents",
    description: "LLM-based agents that plan, use tools, act autonomously or collaborate",
    categories: ["cs.AI", "cs.CL", "cs.MA", "cs.LG"],
    keywords: ["LLM agent", "agentic", "tool use", "multi-agent", "autonomous agent", "computer use"],
    exclude: [] as string[],
    priority: "high",
  },
  {
    name: "Retrieval-Augmented Generation",
    description: "Systems that ground LLM outputs in retrieved documents",
    categories: ["cs.CL", "cs.IR", "cs.AI"],
    keywords: ["retrieval-augmented", "retrieval augmented", "RAG", "GraphRAG", "dense retrieval"],
    exclude: [],
    priority: "normal",
  },
  {
    name: "LLMs for Code",
    description: "LLMs that write, repair, review or reason about code",
    categories: ["cs.SE", "cs.CL", "cs.LG", "cs.PL"],
    keywords: ["code generation", "program synthesis", "code LLM", "SWE-bench", "program repair"],
    exclude: [],
    priority: "normal",
  },
  {
    name: "Industrial Computer Vision",
    description: "Vision for manufacturing, inspection, robotics, industrial QA",
    categories: ["cs.CV", "cs.RO"],
    keywords: ["defect detection", "industrial inspection", "anomaly detection", "manufacturing", "visual inspection"],
    exclude: ["medical", "clinical"],
    priority: "normal",
  },
];

const WATCH_ORGS = [
  "Google DeepMind",
  "OpenAI",
  "Meta",
  "Microsoft Research",
  "Anthropic",
  "Stanford",
  "MIT",
  "Carnegie Mellon",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = neon(url);

  await sql.query(
    `insert into settings (id, recipient_email, watchlist_orgs) values (1, $1, $2)
     on conflict (id) do nothing`,
    [process.env.DEFAULT_RECIPIENT || null, WATCH_ORGS],
  );

  for (const d of DOMAINS) {
    await sql.query(
      `insert into domains (name, description, keywords, categories, exclude_keywords, priority)
       values ($1, $2, $3, $4, $5, $6) on conflict (name) do nothing`,
      [d.name, d.description, d.keywords, d.categories, d.exclude, d.priority],
    );
  }
  console.log(`Seeded settings + ${DOMAINS.length} domains (existing rows left untouched).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
