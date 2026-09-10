import { randomUUID } from "crypto";
import { getDb, initDb } from "../db/client";
import { incidents, events, observations, timeline, incidentEvents } from "../db/schema";
import { eq } from "drizzle-orm";

export type SharedContext = {
  incidentId: string;
  facility: string;
  phase: string;
  status: string;
  observations: string[];
  sensor: { confidence: number | null; status: string };
  latestFindings: { agent: string; finding: string; confidence: number }[];
  hypotheses: { label: string; confidence: number }[];
  openActions: string[];
  humanDecisions: string[];
  contextVersion: number;
};

const mem = new Map<string, SharedContext>();

export async function ensureIncident(id = "042") {
  await initDb();
  const { db } = await getDb();
  const rows = await db.select().from(incidents).where(eq(incidents.id, id));
  if (rows.length === 0) {
    const ctx: SharedContext = {
      incidentId: id, facility: "SENTINEL-7", phase: "ASSESSING", status: "INVESTIGATING",
      observations: [], sensor: { confidence: null, status: "UNKNOWN" },
      latestFindings: [], hypotheses: [], openActions: [], humanDecisions: [], contextVersion: 1,
    };
    mem.set(id, ctx);
    await db.insert(incidents).values({ id, incidentCode: `INC-${id}`, facilityId: "fac-sentinel-7", facility: ctx.facility, title: "SIMULATED DRONE INTRUSION", status: ctx.status, phase: ctx.phase, severity: "UNKNOWN", contextVersion: 1, sharedContext: ctx });
    await db.insert(timeline).values({ id: randomUUID(), incidentId: id, eventType: "INCIDENT_CREATED", kind: "incident_created", label: `Incident #${id} created`, contextVersion: 1, actorType: "SYSTEM" });
    await db.insert(incidentEvents).values({ id: randomUUID(), incidentId: id, eventType: "INCIDENT_CREATED", kind: "incident_created", label: `Incident #${id} created`, contextVersion: 1, actorType: "SYSTEM" }).catch(() => {});
    return ctx;
  }
  const row = rows[0] as unknown as { sharedContext: SharedContext; contextVersion: number };
  const ctx = (row.sharedContext ?? {}) as SharedContext;
  ctx.contextVersion = row.contextVersion;
  mem.set(id, ctx);
  return ctx;
}

export function getContext(id = "042") {
  const c = mem.get(id);
  if (!c) throw new Error("Mission data temporarily unavailable.");
  return c;
}

// Material changes bump version. Returns new version.
export async function applyEvent(id: string, type: string, payload: Record<string, unknown>) {
  const ctx = getContext(id);
  const material = isMaterial(type, payload);
  const nextVersion = material ? ctx.contextVersion + 1 : ctx.contextVersion;

  if (type === "DRONE_DETECTED" || type === "POSITION_UPDATED" || type === "NEW_OBSERVATION" || type === "VISUAL_CONFIRMATION") {
    const t = (payload.text as string) ?? type;
    ctx.observations.push(t);
  }
  if (type === "DETECTION_CONFIDENCE_CHANGED") {
    ctx.sensor.confidence = (payload.confidence as number) ?? ctx.sensor.confidence;
    ctx.sensor.status = (payload.sensorStatus as string) ?? ctx.sensor.status;
  }
  ctx.contextVersion = nextVersion;

  const { db } = await getDb();
  const eid = randomUUID();
  await db.insert(events).values({ id: eid, incidentId: id, type, payload, source: String(payload.source ?? "SIMULATOR"), contextVersion: nextVersion });
  await db.insert(timeline).values({ id: randomUUID(), incidentId: id, eventType: "SIMULATION_EVENT", kind: "simulation_event", label: `${type}`, refId: eid, contextVersion: nextVersion, actorType: "SIMULATOR" });
  if (material) {
    await db.insert(timeline).values({ id: randomUUID(), incidentId: id, eventType: "CONTEXT_UPDATED", kind: "context_updated", label: `Context v${nextVersion}`, contextVersion: nextVersion, actorType: "SYSTEM" });
  }
  // persist snapshot
  const { incidents: inc } = await import("../db/schema");
  await db.update(inc).set({ contextVersion: nextVersion, sharedContext: { ...ctx }, updatedAt: new Date() }).where(eq(inc.id, id));
  if ((payload.text as string) && type !== "DETECTION_CONFIDENCE_CHANGED") {
    await db.insert(observations).values({ id: randomUUID(), incidentId: id, sourceType: ((payload.source as string) ?? "SIMULATOR"), source: ((payload.source as string) ?? "SIMULATOR"), text: (payload.text as string), contextVersion: nextVersion, eventId: eid });
  }
  // Pseudo-sensor event for confidence changes
  if (type === "DETECTION_CONFIDENCE_CHANGED" && payload.confidence !== undefined) {
    const { sensorEvents } = await import("../db/schema");
    await db.insert(sensorEvents).values({ id: randomUUID(), incidentId: id, type: "DETECTION_CONFIDENCE", value: String(payload.confidence), unit: "PERCENT", confidence: payload.confidence as number, eventId: eid }).catch(() => {});
  }
  return { ctx, version: nextVersion, material };
}

function isMaterial(type: string, payload: Record<string, unknown>) {
  // Confidence shifts >=10pts, new observations, position, visual, supervisor, resolution.
  if (type === "DETECTION_CONFIDENCE_CHANGED") return true;
  if (["DRONE_DETECTED", "POSITION_UPDATED", "NEW_OBSERVATION", "VISUAL_CONFIRMATION", "CONFLICTING_INFORMATION", "BOUNDARY_STATUS_CHANGED", "SUPERVISOR_CONFIRMATION", "INCIDENT_RESOLVED", "SENSOR_DEGRADATION"].includes(type)) return true;
  return Boolean(payload.text);
}
