import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;
let client: Sql | null = null;

function getClient(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run a parameterised query ($1, $2 …). Retries once to absorb Neon cold starts.
 * Pass objects for jsonb columns as JSON.stringify(value) with a ::jsonb cast.
 */
export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    return (await getClient().query(text, params)) as T[];
  } catch (err) {
    if (!isTransient(err)) throw err;
    await sleep(1500);
    return (await getClient().query(text, params)) as T[];
  }
}

export async function q1<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /fetch failed|timeout|ECONNRESET|terminating connection|Couldn't connect|503|502/i.test(msg);
}
