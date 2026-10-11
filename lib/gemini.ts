import { GoogleGenAI, ThinkingLevel, type GenerateContentConfig } from "@google/genai";
import type { z } from "zod";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BACKOFF_MS = [2000, 5000, 10000];
const MAX_CONCURRENT = 2;

export function geminiModel() {
  return process.env.GEMINI_MODEL || "gemini-3.8-flash";
}

export function mockGemini() {
  return process.env.MOCK_GEMINI === "true";
}

let ai: GoogleGenAI | null = null;
function client() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) throw new GeminiError("GEMINI_API_KEY is not set", false);
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}

// ---- simple semaphore: at most MAX_CONCURRENT calls in flight ----
let active = 0;
const waiters: (() => void)[] = [];
async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((r) => waiters.push(r));
  active++;
}
function release() {
  active--;
  waiters.shift()?.();
}

/** Keep thinking short so a full run fits the 300 s function limit. */
function thinkingConfig(model: string): GenerateContentConfig["thinkingConfig"] {
  if (/gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  if (/gemini-[3-9]/.test(model)) return { thinkingLevel: ThinkingLevel.LOW };
  return undefined;
}

function statusOf(err: unknown): number | undefined {
  const s = (err as { status?: unknown })?.status;
  if (typeof s === "number") return s;
  const m = String((err as Error)?.message ?? "").match(/"code":\s*(\d{3})|\b(429|500|502|503|504)\b/);
  return m ? Number(m[1] ?? m[2]) : undefined;
}

export interface JsonCallOptions<T> {
  system: string;
  user: string;
  /** JSON Schema passed to Gemini as responseJsonSchema. */
  jsonSchema: Record<string, unknown>;
  zod: z.ZodType<T>;
  /** Deterministic output used when MOCK_GEMINI=true. */
  mock: () => T;
  /** Called once per real API request (for run stats). */
  onCall?: () => void;
}

async function requestOnce(model: string, system: string, user: string, jsonSchema: Record<string, unknown>) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < BACKOFF_MS.length; attempt++) {
    try {
      const res = await client().models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          thinkingConfig: thinkingConfig(model),
          httpOptions: { timeout: 90_000 },
        },
      });
      return res.text ?? "";
    } catch (err) {
      lastErr = err;
      const status = statusOf(err);
      const retryable = status === undefined ? /timeout|fetch failed|ECONNRESET/i.test(String(err)) : status === 429 || status >= 500;
      if (!retryable) throw new GeminiError(String((err as Error)?.message ?? err).slice(0, 300), false);
      if (attempt < BACKOFF_MS.length - 1) await sleep(BACKOFF_MS[attempt]);
    }
  }
  throw new GeminiError(String((lastErr as Error)?.message ?? lastErr).slice(0, 300), true);
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  return JSON.parse(trimmed);
}

/** Call Gemini for JSON, validate with zod, one repair retry if the output is invalid. */
export async function generateJson<T>(opts: JsonCallOptions<T>): Promise<T> {
  if (mockGemini()) return opts.zod.parse(opts.mock());
  const model = geminiModel();
  await acquire();
  try {
    opts.onCall?.();
    const raw = await requestOnce(model, opts.system, opts.user, opts.jsonSchema);
    try {
      return opts.zod.parse(parseJson(raw));
    } catch {
      opts.onCall?.();
      const repaired = await requestOnce(
        model,
        opts.system,
        `${opts.user}\n\nYour previous reply was not valid. Return valid JSON matching the schema.`,
        opts.jsonSchema,
      );
      try {
        return opts.zod.parse(parseJson(repaired));
      } catch (e) {
        throw new GeminiError(`Invalid JSON from Gemini: ${(e as Error).message.slice(0, 200)}`, false);
      }
    }
  } finally {
    release();
  }
}
