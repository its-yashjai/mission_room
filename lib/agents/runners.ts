import { randomUUID } from "crypto";
import { searchMoss } from "../moss/client";
import { getDb } from "../db/client";
import { findings, evidence, timeline, findingEvidence, findingDependencies, agentRuns } from "../db/schema";

export type AgentName = "intelligence" | "safety" | "operations";

export type StructuredFinding = {
  agent: AgentName;
  finding: string;
  confidence: number;
  supportingEvidence: string[];
  contradictoryEvidence: string[];
  informationNeeded: string[];
  dependsOn: string[];
  evidenceCards: { id: string; excerpt: string; score: number; latencyMs: number; why: string; meta: Record<string, unknown> }[];
};

// Template synthesizer (deterministic, evidence-grounded). LLM plugs in later
// behind the same return type; backend/DB rules stay authoritative.
async function retrieve(query: string, why: string, topK = 3) {
  const hits = await searchMoss(query, topK);
  return hits.map((h) => ({
    id: h.id,
    excerpt: h.text.slice(0, 280),
    score: h.score,
    latencyMs: h.latencyMs,
    why,
    meta: h.metadata,
  }));
}

export async function runAgent(agent: AgentName, incidentId: string, contextVersion: number, ctxText: string): Promise<StructuredFinding> {
  const { db } = await getDb();
  const runId = randomUUID();
  const startedAt = new Date();
  await db.insert(timeline).values({ id: randomUUID(), incidentId, eventType: "AGENT_STARTED", kind: "agent_started", label: `${agent} investigating (ctx v${contextVersion})`, contextVersion, actorType: "AGENT", actorId: agent });
  // Seed agentRuns as STARTED; will complete in persistFinding
  try {
    await db.insert(agentRuns).values({ id: randomUUID(), incidentId, agentId: agent, runId, contextVersion, status: "STARTED", startedAt });
  } catch {
    // PGlite FK may fail if agents not seeded; ignore for prototype
  }

  if (agent === "intelligence") {
    const cards = await retrieve(`historical similar incident ${ctxText}`, "Similar historical incident", 3);
    await db.insert(timeline).values({ id: randomUUID(), incidentId, eventType: "EVIDENCE_RETRIEVED", kind: "moss_retrieval", label: `intelligence Moss: ${cards.length} hits`, contextVersion, actorType: "AGENT", actorId: agent });
    return {
      agent, finding: "Historical evidence shows similar slow-approach observations (e.g. INC-018) that resolved as low concern after visual; identity not yet verified for this incident.",
      confidence: 0.62, supportingEvidence: cards.map((c) => c.id), contradictoryEvidence: [],
      informationNeeded: ["visual confirmation", "current location"],
      dependsOn: ["observations", "sensor.confidence"],
      evidenceCards: cards,
    };
  }
  if (agent === "safety") {
    const cards = await retrieve(`facility safety verification escalation procedure ${ctxText}`, "Facility verification procedure", 3);
    await db.insert(timeline).values({ id: randomUUID(), incidentId, eventType: "EVIDENCE_RETRIEVED", kind: "moss_retrieval", label: `safety Moss: ${cards.length} hits`, contextVersion, actorType: "AGENT", actorId: agent });
    return {
      agent, finding: "Current procedure requires visual verification before closure; sensor-only tracks must not close the incident.",
      confidence: 0.9, supportingEvidence: cards.map((c) => c.id), contradictoryEvidence: [],
      informationNeeded: ["visual confirmation", "sensor status"],
      dependsOn: ["observations", "sensor.status"],
      evidenceCards: cards,
    };
  }
  const cards = await retrieve(`safe operational coordination checklist ${ctxText}`, "Safe coordination checklist", 3);
  await db.insert(timeline).values({ id: randomUUID(), incidentId, eventType: "EVIDENCE_RETRIEVED", kind: "moss_retrieval", label: `operations Moss: ${cards.length} hits`, contextVersion, actorType: "AGENT", actorId: agent });
  return {
    agent, finding: "Recommend: notify internal security, request visual verification + current location/sensor status, supervisor review, continue logging.",
    confidence: 0.7, supportingEvidence: cards.map((c) => c.id), contradictoryEvidence: [],
    informationNeeded: ["current location", "sensor status"],
    dependsOn: ["observations"],
    evidenceCards: cards,
  };
}

export async function persistFinding(incidentId: string, f: StructuredFinding, contextVersion: number) {
  const { db } = await getDb();
  const fid = randomUUID();
  await db.insert(findings).values({
    id: fid, incidentId, agentId: f.agent, agent: f.agent, finding: f.finding, confidence: f.confidence,
    supportingEvidence: f.supportingEvidence, contradictoryEvidence: f.contradictoryEvidence,
    informationNeeded: f.informationNeeded, basedOnContextVersion: contextVersion, status: "ACTIVE", dependsOn: f.dependsOn,
  });
  for (const c of f.evidenceCards) {
    const eid = `${fid}-${c.id}`.slice(0, 60);
    await db.insert(evidence).values({
      id: eid, incidentId, findingId: fid,
      source: c.id, docType: String((c.meta as Record<string, unknown>)?.docType ?? "knowledge"),
      section: String((c.meta as Record<string, unknown>)?.section ?? ""),
      excerpt: c.excerpt, score: c.score, latencyMs: c.latencyMs, whyRetrieved: c.why, retrievalQuery: c.why,
    });
    // Normalized relation SUPPORTING
    try {
      await db.insert(findingEvidence).values({ id: randomUUID(), findingId: fid, evidenceId: eid, relationship: "SUPPORTING" });
    } catch {}
    await db.insert(timeline).values({ id: randomUUID(), incidentId, eventType: "EVIDENCE_RETRIEVED", kind: "evidence_found", label: `${c.id} (${c.latencyMs.toFixed(1)}ms)`, refId: fid, contextVersion, actorType: "AGENT", actorId: f.agent });
  }
  // Contradictory evidence normalized (if any)
  for (const cid of f.contradictoryEvidence) {
    // No evidence row yet; skip unless matched; placeholder for future
  }
  // Dependencies for stale detection
  for (const dep of f.dependsOn) {
    const type = dep.startsWith("sensor") ? "SENSOR" : dep === "observations" ? "OBSERVATION" : "EVENT";
    try {
      await db.insert(findingDependencies).values({ id: randomUUID(), findingId: fid, dependencyType: type, dependencyId: dep });
    } catch {}
  }
  await db.insert(timeline).values({ id: randomUUID(), incidentId, eventType: "FINDING_CREATED", kind: "finding_created", label: `${f.agent} finding @v${contextVersion}`, refId: fid, contextVersion, actorType: "AGENT", actorId: f.agent });
  // Complete agentRuns for this finding version
  try {
    await db.insert(agentRuns).values({ id: randomUUID(), incidentId, agentId: f.agent, runId: `${fid}-run`, contextVersion, status: "COMPLETED", startedAt: new Date(), completedAt: new Date(), latencyMs: f.evidenceCards.reduce((a, c) => a + c.latencyMs, 0), resultSummary: f.finding.slice(0, 120) });
  } catch {}
  return fid;
}
