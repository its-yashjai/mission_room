import { randomUUID } from "crypto";
import { searchMoss } from "../moss/client";
import { getDb } from "../db/client";
import { findings, evidence, timeline } from "../db/schema";

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
  await db.insert(timeline).values({ id: randomUUID(), incidentId, kind: "agent_started", label: `${agent} investigating (ctx v${contextVersion})`, contextVersion });

  if (agent === "intelligence") {
    const cards = await retrieve(`historical similar incident ${ctxText}`, "Similar historical incident", 3);
    await db.insert(timeline).values({ id: randomUUID(), incidentId, kind: "moss_retrieval", label: `intelligence Moss: ${cards.length} hits`, contextVersion });
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
    await db.insert(timeline).values({ id: randomUUID(), incidentId, kind: "moss_retrieval", label: `safety Moss: ${cards.length} hits`, contextVersion });
    return {
      agent, finding: "Current procedure requires visual verification before closure; sensor-only tracks must not close the incident.",
      confidence: 0.9, supportingEvidence: cards.map((c) => c.id), contradictoryEvidence: [],
      informationNeeded: ["visual confirmation", "sensor status"],
      dependsOn: ["observations", "sensor.status"],
      evidenceCards: cards,
    };
  }
  const cards = await retrieve(`safe operational coordination checklist ${ctxText}`, "Safe coordination checklist", 3);
  await db.insert(timeline).values({ id: randomUUID(), incidentId, kind: "moss_retrieval", label: `operations Moss: ${cards.length} hits`, contextVersion });
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
    id: fid, incidentId, agent: f.agent, finding: f.finding, confidence: f.confidence,
    supportingEvidence: f.supportingEvidence, contradictoryEvidence: f.contradictoryEvidence,
    informationNeeded: f.informationNeeded, basedOnContextVersion: contextVersion, status: "ACTIVE", dependsOn: f.dependsOn,
  });
  for (const c of f.evidenceCards) {
    await db.insert(evidence).values({
      id: `${fid}-${c.id}`.slice(0, 60), incidentId, findingId: fid,
      source: c.id, docType: String((c.meta as Record<string, unknown>)?.docType ?? "knowledge"),
      section: String((c.meta as Record<string, unknown>)?.section ?? ""),
      excerpt: c.excerpt, score: c.score, latencyMs: c.latencyMs, whyRetrieved: c.why,
    });
    await db.insert(timeline).values({ id: randomUUID(), incidentId, kind: "evidence_found", label: `${c.id} (${c.latencyMs.toFixed(1)}ms)`, refId: fid, contextVersion });
  }
  await db.insert(timeline).values({ id: randomUUID(), incidentId, kind: "finding_created", label: `${f.agent} finding @v${contextVersion}`, refId: fid, contextVersion });
  return fid;
}
