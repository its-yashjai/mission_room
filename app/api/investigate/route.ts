import { NextResponse } from "next/server";
import { ensureIncident, getContext } from "@/lib/context/store";

export const runtime = "nodejs";
import { investigate } from "@/lib/coordinator/orchestrator";

export async function POST() {
  try {
    await ensureIncident("042");
    const r = await investigate("042");
    return NextResponse.json({ ok: true, ...r, context: getContext("042") });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI analysis unavailable.";
    const status = /retrieval unavailable/i.test(msg) ? 503 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
