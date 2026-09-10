import { pgTable, text, integer, real, timestamp, jsonb, boolean, index, unique } from "drizzle-orm/pg-core";

// ============================================================
// Mission Room — Normalized authoritative schema
// PostgreSQL = source of truth, Moss = retrieval, LLM = interpretation
// See docs/LOCKED_DECISIONS.md, docs/PROGRESS.md
// This file replaces denormalized JSON arrays with proper relations.
// ============================================================

// 1. Users — multiplayer participants
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("OPERATOR"), // COMMANDER | OPERATOR | OBSERVER | SUPERVISOR
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Facilities — fictional locations
export const facilities = pgTable("facilities", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // SENTINEL-7
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Agents — AI specialists (seeded)
export const agents = pgTable("agents", {
  id: text("id").primaryKey(), // intelligence | safety | operations
  key: text("key").notNull().unique(), // INTELLIGENCE
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("SPECIALIST"),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Documents — knowledge metadata (Moss source)
export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  externalId: text("external_id"),
  title: text("title").notNull(),
  documentType: text("document_type").notNull(), // procedure | safety | technical | operations | communications | closure
  version: text("version"),
  facilityId: text("facility_id").references(() => facilities.id),
  effectiveDate: timestamp("effective_date"),
  storagePath: text("storage_path"),
  mossDocumentId: text("moss_document_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. Incidents — main operational object
export const incidents = pgTable(
  "incidents",
  {
    id: text("id").primaryKey(), // 042 / INC-042
    incidentCode: text("incident_code").unique(), // INC-042
    facilityId: text("facility_id").references(() => facilities.id),
    facility: text("facility").notNull().default("SENTINEL-7"), // denormalized for fast read; FK is authoritative
    title: text("title").notNull(),
    type: text("type"), // DRONE_INTRUSION etc.
    status: text("status").notNull().default("INVESTIGATING"), // INVESTIGATING | RESOLVED | CLOSED
    phase: text("phase").notNull().default("ASSESSING"), // ASSESSING | VERIFYING | RESOLVED
    severity: text("severity").notNull().default("UNKNOWN"), // UNKNOWN | LOW | MEDIUM | HIGH
    outcome: text("outcome"), // RESOLVED_LOW_CONCERN | UNRESOLVED | ELEVATED_CONCERN
    contextVersion: integer("context_version").notNull().default(1),
    // Deprecated cache — DO NOT use as source of truth. Build context via getIncidentContext()
    sharedContext: jsonb("shared_context").$type<Record<string, unknown>>().notNull().default({}),
    summary: text("summary"),
    createdBy: text("created_by").references(() => users.id),
    startedAt: timestamp("started_at").defaultNow(),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("incidents_facility_idx").on(t.facilityId),
    index("incidents_status_idx").on(t.status),
  ],
);

// 6. Incident participants — multiplayer
export const incidentParticipants = pgTable(
  "incident_participants",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("OPERATOR"),
    status: text("status").notNull().default("ONLINE"), // ONLINE | OFFLINE | LEFT
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    leftAt: timestamp("left_at"),
  },
  (t) => [unique("incident_user_unique").on(t.incidentId, t.userId), index("incident_participants_incident_idx").on(t.incidentId)],
);

// 7. Incident agents — agent attachment per incident
export const incidentAgents = pgTable(
  "incident_agents",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    status: text("status").notNull().default("IDLE"), // IDLE | INVESTIGATING | REVIEWING | WAITING
    currentTask: text("current_task"),
    lastRunAt: timestamp("last_run_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("incident_agent_unique").on(t.incidentId, t.agentId)],
);

// 8. Events — raw incident event stream (immutable, ordered)
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // DRONE_DETECTED | POSITION_UPDATED | ...
    source: text("source").notNull().default("SIMULATOR"), // SIMULATOR | HUMAN | SENSOR | SYSTEM
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    contextVersion: integer("context_version").notNull(),
    sequenceNumber: integer("sequence_number"),
    occurredAt: timestamp("occurred_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("events_incident_version_idx").on(t.incidentId, t.contextVersion), index("events_type_idx").on(t.type)],
);

// 9. Observations — human/simulator observations (distinct from raw events)
export const observations = pgTable(
  "observations",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull().default("SIMULATOR"), // SIMULATOR | HUMAN | AGENT — legacy `source` kept as alias
    source: text("source").notNull().default("SIMULATOR"), // legacy compat
    createdBy: text("created_by").references(() => users.id),
    text: text("text").notNull(),
    confidence: real("confidence"),
    eventId: text("event_id").references(() => events.id),
    contextVersion: integer("context_version").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("observations_incident_idx").on(t.incidentId)],
);

// 10. Sensor events — structured sensor data
export const sensorEvents = pgTable(
  "sensor_events",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // DETECTION_CONFIDENCE | SENSOR_STATUS | BOUNDARY
    value: text("value"),
    unit: text("unit"), // PERCENT | METERS
    confidence: real("confidence"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    eventId: text("event_id").references(() => events.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("sensor_events_incident_idx").on(t.incidentId)],
);

// 11. Evidence — retrieved chunk for this incident (Document -> Moss -> Evidence)
export const evidence = pgTable(
  "evidence",
  {
    id: text("id").primaryKey(), // EV-xxx or fid-docId
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    documentId: text("document_id").references(() => documents.id),
    findingId: text("finding_id"), // legacy compat; proper relation via findingEvidence
    source: text("source").notNull(), // Moss doc id
    citation: text("citation"),
    docType: text("doc_type").notNull().default("knowledge"),
    section: text("section").notNull().default(""),
    excerpt: text("excerpt").notNull(),
    score: real("score"),
    latencyMs: real("latency_ms").notNull(),
    retrievalQuery: text("retrieval_query"),
    whyRetrieved: text("why_retrieved").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("evidence_incident_idx").on(t.incidentId), index("evidence_document_idx").on(t.documentId)],
);

// 12. Findings — agent interpretations (normalized)
export const findings = pgTable(
  "findings",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    agentId: text("agent_id").references(() => agents.id),
    agent: text("agent").notNull(), // legacy text: intelligence | safety | operations
    title: text("title"),
    finding: text("finding").notNull(),
    confidence: real("confidence").notNull(),
    // Deprecated JSON arrays — kept for compat, new code must use findingEvidence
    supportingEvidence: jsonb("supporting_evidence").$type<string[]>().notNull().default([]),
    contradictoryEvidence: jsonb("contradictory_evidence").$type<string[]>().notNull().default([]),
    informationNeeded: jsonb("information_needed").$type<string[]>().notNull().default([]),
    dependsOn: jsonb("depends_on").$type<string[]>().notNull().default([]),
    basedOnContextVersion: integer("based_on_context_version").notNull(),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | STALE | SUPERSEDED | REJECTED
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("findings_incident_agent_idx").on(t.incidentId, t.agent), index("findings_context_version_idx").on(t.basedOnContextVersion)],
);

// 13. Finding <-> Evidence (SUPPORTING | CONTRADICTING)
export const findingEvidence = pgTable(
  "finding_evidence",
  {
    id: text("id").primaryKey(),
    findingId: text("finding_id")
      .notNull()
      .references(() => findings.id, { onDelete: "cascade" }),
    evidenceId: text("evidence_id")
      .notNull()
      .references(() => evidence.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(), // SUPPORTING | CONTRADICTING
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("finding_evidence_unique").on(t.findingId, t.evidenceId)],
);

// 14. Finding dependencies — for stale detection
export const findingDependencies = pgTable(
  "finding_dependencies",
  {
    id: text("id").primaryKey(),
    findingId: text("finding_id")
      .notNull()
      .references(() => findings.id, { onDelete: "cascade" }),
    dependencyType: text("dependency_type").notNull(), // OBSERVATION | EVENT | EVIDENCE | SENSOR
    dependencyId: text("dependency_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("finding_dependencies_finding_idx").on(t.findingId)],
);

// 15. Hypotheses — competing explanations
export const hypotheses = pgTable(
  "hypotheses",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    confidence: real("confidence").notNull(),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | SUPPORTED | CHALLENGED | REJECTED | RESOLVED
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("hypotheses_incident_idx").on(t.incidentId)],
);

// 16. Hypothesis <-> Evidence
export const hypothesisEvidence = pgTable(
  "hypothesis_evidence",
  {
    id: text("id").primaryKey(),
    hypothesisId: text("hypothesis_id")
      .notNull()
      .references(() => hypotheses.id, { onDelete: "cascade" }),
    evidenceId: text("evidence_id")
      .notNull()
      .references(() => evidence.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(), // SUPPORTING | CONTRADICTING
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("hypothesis_evidence_unique").on(t.hypothesisId, t.evidenceId)],
);

// 17. Actions — recommended/assigned work (separate from decisions)
export const actions = pgTable(
  "actions",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").notNull().default("COORDINATION"), // NOTIFY | VERIFY | REVIEW | LOG | REPORT
    ownerId: text("owner_id").references(() => users.id),
    status: text("status").notNull().default("PROPOSED"), // PROPOSED | AWAITING_APPROVAL | APPROVED | REJECTED | IN_PROGRESS | COMPLETED | CANCELLED
    priority: text("priority").notNull().default("MEDIUM"),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    proposedBy: text("proposed_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("actions_incident_idx").on(t.incidentId), index("actions_status_idx").on(t.status)],
);

// 18. Decisions — human approvals (one per consequential action)
export const decisions = pgTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    actionId: text("action_id").references(() => actions.id),
    kind: text("kind").notNull().default("HUMAN_APPROVAL"), // legacy: HUMAN_APPROVAL | HUMAN_OBSERVATION | ACTION_PROPOSED — new should use actionId
    decision: text("decision"), // APPROVE | REJECT | CONTINUE_VERIFICATION
    rationale: text("rationale"),
    decidedBy: text("decided_by").references(() => users.id),
    summary: text("summary").notNull(), // legacy compat
    approved: jsonb("approved"),
    contextVersion: integer("context_version").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("decisions_incident_idx").on(t.incidentId)],
);

// 19. Incident events — immutable audit timeline (replay source)
export const incidentEvents = pgTable(
  "incident_events",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    eventId: text("event_id").references(() => events.id),
    eventType: text("event_type").notNull().default("UNKNOWN"), // AGENT_STARTED | EVIDENCE_RETRIEVED | FINDING_CREATED | ...
    actorType: text("actor_type"), // AGENT | HUMAN | SYSTEM | SIMULATOR
    actorId: text("actor_id"),
    kind: text("kind").notNull().default("UNKNOWN"), // legacy compat alias for eventType
    label: text("label").notNull(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    contextVersion: integer("context_version"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("incident_events_incident_idx").on(t.incidentId), index("incident_events_version_idx").on(t.contextVersion)],
);

// Legacy alias: code imports `timeline` — keep as view on incident_events
export const timeline = incidentEvents;

// 20. Agent runs — per-agent execution trace (perf + debug)
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    runId: text("run_id").notNull().unique(),
    triggerEventId: text("trigger_event_id").references(() => events.id),
    contextVersion: integer("context_version").notNull(),
    status: text("status").notNull().default("COMPLETED"), // STARTED | COMPLETED | FAILED
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    latencyMs: real("latency_ms"),
    resultSummary: text("result_summary"),
    errorCode: text("error_code"),
  },
  (t) => [index("agent_runs_incident_idx").on(t.incidentId), index("agent_runs_agent_idx").on(t.agentId)],
);

// 21. Reports — evidence-backed outcome docs
export const reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("DRAFT"), // DRAFT | PUBLISHED | ARCHIVED
    content: text("content").notNull(),
    reportType: text("report_type"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("reports_incident_idx").on(t.incidentId)],
);
