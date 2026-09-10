import { getContext } from "../context/store";
import { runAgent, persistFinding, type AgentName } from "../agents/runners";
import { getDb } from "../db/client";
import { timeline } from "../db/schema";
import { randomUUID } from "crypto";

// Coordinator: parallel fan-out, structured collect, shared-context update.
export async function investigate(incidentId = "042", agents: AgentName[] = ["intelligence", "safety", "operations"]) {
  const ctx = getContext(incidentId);
  const version = ctx.contextVersion;
  const ctxText = [...ctx.observations].slice(-3).join(" | ") || "unidentified drone near SENTINEL-7";

  const settled = await Promise.allSettled(
    agents.map(async (a) => {
      const f = await runAgent(a, incidentId, version, ctxText);
      const fid = await persistFinding(incidentId, f, version);
      return { agent: a, finding: f, fid };
    })
  );

  const ok = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
  const failed = settled.filter((s) => s.status === "rejected");

  // Update shared context snapshot (in-memory; DB snapshot on next event).
  ctx.latestFindings = ok.map((o) => ({ agent: o.agent, finding: o.finding.finding, confidence: o.finding.confidence }));
  const gaps = Array.from(new Set(ok.flatMap((o) => o.finding.informationNeeded)));
  ctx.openActions = gaps.slice(0, 5);
  // Hypotheses stay uncertain by policy: benign/unresolved vs security concern.
  const intel = ok.find((o) => o.agent === "intelligence");
  ctx.hypotheses = [
    { label: "BENIGN / UNRESOLVED", confidence: intel ? Math.round(intel.finding.confidence * 100) : 50 },
    { label: "SECURITY CONCERN", confidence: intel ? 100 - Math.round(intel.finding.confidence * 100) : 50 },
  ];

  if (failed.length > 0) {
    const { db } = await getDb();
    await db.insert(timeline).values({ id: randomUUID(), incidentId, kind: "agent_started", label: `${failed.length} agent(s) unavailable (AI analysis unavailable)`, contextVersion: version });
  }
  return { version, results: ok.map((o) => o.finding), failed: failed.length };
}
