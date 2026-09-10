import { pgTable, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";

// One row per incident. contextVersion increments on every material change.
export const incidents = pgTable("incidents", {
  id: text("id").primaryKey(), // e.g. "042"
  facility: text("facility").notNull().default("SENTINEL-7"),
  title: text("title").notNull(),
  status: text("status").notNull().default("INVESTIGATING"),
  phase: text("phase").notNull().default("ASSESSING"),
  severity: text("severity").notNull().default("UNKNOWN"),
  contextVersion: integer("context_version").notNull().default(1),
  // Denormalized snapshot of shared context for fast UI reads.
  sharedContext: jsonb("shared_context").$type<Record<string, unknown>>().notNull().default({}),
  outcome: text("outcome"), // RESOLVED_LOW_CONCERN | UNRESOLVED | ELEVATED_CONCERN | null
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  type: text("type").notNull(),
  // e.g. DRONE_DETECTED, POSITION_UPDATED, DETECTION_CONFIDENCE_CHANGED...
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  contextVersion: integer("context_version").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const observations = pgTable("observations", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  source: text("source").notNull(), // SIMULATOR | HUMAN | AGENT
  text: text("text").notNull(),
  contextVersion: integer("context_version").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const findings = pgTable("findings", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  agent: text("agent").notNull(), // intelligence | safety | operations
  finding: text("finding").notNull(),
  confidence: real("confidence").notNull(),
  supportingEvidence: jsonb("supporting_evidence").$type<string[]>().notNull().default([]),
  contradictoryEvidence: jsonb("contradictory_evidence").$type<string[]>().notNull().default([]),
  informationNeeded: jsonb("information_needed").$type<string[]>().notNull().default([]),
  basedOnContextVersion: integer("based_on_context_version").notNull(),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | STALE | SUPERSEDED
  // Which shared-context fields this finding depends on (for stale detection).
  dependsOn: jsonb("depends_on").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const evidence = pgTable("evidence", {
  id: text("id").primaryKey(), // Moss doc id, e.g. EV-018
  incidentId: text("incident_id").notNull(),
  findingId: text("finding_id"),
  source: text("source").notNull(),
  docType: text("doc_type").notNull(),
  section: text("section").notNull().default(""),
  excerpt: text("excerpt").notNull(),
  score: real("score"),
  latencyMs: real("latency_ms").notNull(),
  whyRetrieved: text("why_retrieved").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const timeline = pgTable("timeline", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  kind: text("kind").notNull(),
  // incident_created, simulation_event, agent_started, moss_retrieval, evidence_found,
  // finding_created, context_updated, finding_stale, reassessment_started, new_finding,
  // disagreement, human_input, action_proposed, human_approval, incident_resolved, report_created
  label: text("label").notNull(),
  refId: text("ref_id"),
  contextVersion: integer("context_version"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const decisions = pgTable("decisions", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  kind: text("kind").notNull(), // HUMAN_APPROVAL | HUMAN_OBSERVATION | ACTION_PROPOSED
  summary: text("summary").notNull(),
  approved: jsonb("approved"),
  contextVersion: integer("context_version").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
