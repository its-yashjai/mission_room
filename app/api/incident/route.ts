import { NextResponse } from "next/server";
import { ensureIncident, getContext } from "@/lib/context/store";

export const runtime = "nodejs";

export async function POST() {
  try {
    await ensureIncident("042");
    return NextResponse.json({ ok: true, context: getContext("042") });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Mission data temporarily unavailable." }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureIncident("042");
    return NextResponse.json({ ok: true, context: getContext("042") });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Mission data temporarily unavailable." }, { status: 500 });
  }
}
