import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { geminiModel } from "@/lib/gemini";

export const dynamic = "force-dynamic";

const ENV_VARS = [
  "DATABASE_URL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "RESEND_API_KEY",
  "DEFAULT_RECIPIENT",
  "CRON_SECRET",
  "APP_URL",
  "EMAIL_FROM",
  "S2_API_KEY",
  "ADMIN_PASSCODE",
  "SESSION_SECRET",
];

export async function GET() {
  let db = "ok";
  try {
    await q("select 1 from settings limit 1");
  } catch (e) {
    db = `error: ${(e as Error).message.slice(0, 120)}`;
  }
  const env = Object.fromEntries(ENV_VARS.map((k) => [k, Boolean(process.env[k])]));
  const required = ["DATABASE_URL", "GEMINI_API_KEY", "RESEND_API_KEY", "CRON_SECRET"];
  const ok = db === "ok" && required.every((k) => env[k]);
  return NextResponse.json(
    {
      ok,
      db,
      env,
      gemini_model: geminiModel(),
      test_mode: process.env.TEST_MODE === "true",
      mock_gemini: process.env.MOCK_GEMINI === "true",
    },
    { status: ok ? 200 : 503 },
  );
}
