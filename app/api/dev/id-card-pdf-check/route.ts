import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
  const supabaseUrl = process.env.SUPABASE_URL || null;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

  const result: any = {
    puppeteer_executable_path: execPath,
    puppeteer_executable_exists: false,
    supabase_url: !!supabaseUrl,
    supabase_service_role_key: !!supabaseKey,
    puppeteer_core_available: false,
  };

  if (execPath) {
    try {
      result.puppeteer_executable_exists = fs.existsSync(execPath);
    } catch (e) {
      result.puppeteer_executable_exists = false;
    }
  }

  try {
    // dynamic import to avoid bundling issues
    const mod = await import('puppeteer-core');
    result.puppeteer_core_available = !!mod;
  } catch (e) {
    result.puppeteer_core_available = false;
  }

  // Best-effort health
  const ok = result.puppeteer_core_available && execPath && result.puppeteer_executable_exists && supabaseUrl && supabaseKey;

  return NextResponse.json({ ok, details: result });
}
