import { NextResponse } from "next/server";
import { ensureIncident, applyEvent } from "@/lib/context/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { type, payload } = await req.json();
    if (!type) return NextResponse.json({ ok: false, error: "type required" }, { status: 400 });
    await ensureIncident("042");
    const r = await applyEvent("042", type, payload ?? {});
    return NextResponse.json({ ok: true, version: r.version, material: r.material, context: r.ctx });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Mission data temporarily unavailable." }, { status: 500 });
  }
}
