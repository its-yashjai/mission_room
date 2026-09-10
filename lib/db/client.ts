import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
let client: PGlite | null = null;

export async function getDb() {
  if (db) return { db, client };
  if (process.env.DATABASE_URL) {
    const sql = postgres(process.env.DATABASE_URL);
    db = drizzlePg(sql, { schema });
    return { db, client: null };
  }
  // Local dev fallback: embedded PGlite, no Docker needed. Same Drizzle schema.
  client = new PGlite();
  db = drizzlePglite(client, { schema });
  return { db, client };
}

export async function initDb() {
  const { db: d } = await getDb();
  // Core — keep creation order for FKs. Idempotent via IF NOT EXISTS.
  await d.execute(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'OPERATOR', created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS facilities (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, type TEXT NOT NULL DEFAULT 'SPECIALIST', status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, external_id TEXT, title TEXT NOT NULL, document_type TEXT NOT NULL, version TEXT, facility_id TEXT REFERENCES facilities(id), effective_date TIMESTAMP, storage_path TEXT, moss_document_id TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, incident_code TEXT UNIQUE, facility_id TEXT REFERENCES facilities(id), facility TEXT NOT NULL DEFAULT 'SENTINEL-7', title TEXT NOT NULL, type TEXT, status TEXT NOT NULL DEFAULT 'INVESTIGATING', phase TEXT NOT NULL DEFAULT 'ASSESSING', severity TEXT NOT NULL DEFAULT 'UNKNOWN', outcome TEXT, context_version INTEGER NOT NULL DEFAULT 1, shared_context JSONB NOT NULL DEFAULT '{}', summary TEXT, created_by TEXT REFERENCES users(id), started_at TIMESTAMP DEFAULT NOW(), resolved_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS incident_participants (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'OPERATOR', status TEXT NOT NULL DEFAULT 'ONLINE', joined_at TIMESTAMP DEFAULT NOW() NOT NULL, left_at TIMESTAMP, UNIQUE(incident_id, user_id))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS incident_agents (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, agent_id TEXT NOT NULL REFERENCES agents(id), status TEXT NOT NULL DEFAULT 'IDLE', current_task TEXT, last_run_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW() NOT NULL, UNIQUE(incident_id, agent_id))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, type TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'SIMULATOR', payload JSONB NOT NULL DEFAULT '{}', context_version INTEGER NOT NULL, sequence_number INTEGER, occurred_at TIMESTAMP DEFAULT NOW(), created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS observations (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, source_type TEXT NOT NULL DEFAULT 'SIMULATOR', source TEXT NOT NULL DEFAULT 'SIMULATOR', created_by TEXT REFERENCES users(id), text TEXT NOT NULL, confidence REAL, event_id TEXT REFERENCES events(id), context_version INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS sensor_events (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, type TEXT NOT NULL, value TEXT, unit TEXT, confidence REAL, metadata JSONB DEFAULT '{}', event_id TEXT REFERENCES events(id), created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, document_id TEXT REFERENCES documents(id), finding_id TEXT, source TEXT NOT NULL, citation TEXT, doc_type TEXT NOT NULL DEFAULT 'knowledge', section TEXT NOT NULL DEFAULT '', excerpt TEXT NOT NULL, score REAL, latency_ms REAL NOT NULL, retrieval_query TEXT, why_retrieved TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, agent_id TEXT REFERENCES agents(id), agent TEXT NOT NULL, title TEXT, finding TEXT NOT NULL, confidence REAL NOT NULL, supporting_evidence JSONB NOT NULL DEFAULT '[]', contradictory_evidence JSONB NOT NULL DEFAULT '[]', information_needed JSONB NOT NULL DEFAULT '[]', depends_on JSONB NOT NULL DEFAULT '[]', based_on_context_version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW())`);
  await d.execute(`CREATE TABLE IF NOT EXISTS finding_evidence (id TEXT PRIMARY KEY, finding_id TEXT NOT NULL REFERENCES findings(id) ON DELETE CASCADE, evidence_id TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE, relationship TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL, UNIQUE(finding_id, evidence_id))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS finding_dependencies (id TEXT PRIMARY KEY, finding_id TEXT NOT NULL REFERENCES findings(id) ON DELETE CASCADE, dependency_type TEXT NOT NULL, dependency_id TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS hypotheses (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, confidence REAL NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', created_by TEXT REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW())`);
  await d.execute(`CREATE TABLE IF NOT EXISTS hypothesis_evidence (id TEXT PRIMARY KEY, hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE, evidence_id TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE, relationship TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL, UNIQUE(hypothesis_id, evidence_id))`);
  await d.execute(`CREATE TABLE IF NOT EXISTS actions (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, type TEXT NOT NULL DEFAULT 'COORDINATION', owner_id TEXT REFERENCES users(id), status TEXT NOT NULL DEFAULT 'PROPOSED', priority TEXT NOT NULL DEFAULT 'MEDIUM', requires_approval BOOLEAN NOT NULL DEFAULT false, proposed_by TEXT REFERENCES users(id), approved_by TEXT REFERENCES users(id), approved_at TIMESTAMP, completed_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS decisions (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, action_id TEXT REFERENCES actions(id), kind TEXT NOT NULL DEFAULT 'HUMAN_APPROVAL', decision TEXT, rationale TEXT, decided_by TEXT REFERENCES users(id), summary TEXT NOT NULL, approved JSONB, context_version INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS incident_events (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, event_id TEXT REFERENCES events(id), event_type TEXT NOT NULL DEFAULT 'UNKNOWN', actor_type TEXT, actor_id TEXT, kind TEXT NOT NULL DEFAULT 'UNKNOWN', label TEXT NOT NULL, ref_type TEXT, ref_id TEXT, context_version INTEGER, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS timeline (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, event_id TEXT REFERENCES events(id), event_type TEXT NOT NULL DEFAULT 'UNKNOWN', actor_type TEXT, actor_id TEXT, kind TEXT NOT NULL DEFAULT 'UNKNOWN', label TEXT NOT NULL, ref_type TEXT, ref_id TEXT, context_version INTEGER, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS agent_runs (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, agent_id TEXT NOT NULL REFERENCES agents(id), run_id TEXT NOT NULL UNIQUE, trigger_event_id TEXT REFERENCES events(id), context_version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'COMPLETED', started_at TIMESTAMP DEFAULT NOW() NOT NULL, completed_at TIMESTAMP, latency_ms REAL, result_summary TEXT, error_code TEXT)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'DRAFT', content TEXT NOT NULL, report_type TEXT, created_by TEXT REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  // Seed immutable reference data if empty
  await d.execute(`INSERT INTO facilities (id, code, name, status) VALUES ('fac-sentinel-7', 'SENTINEL-7', 'Sentinel Seven', 'ACTIVE') ON CONFLICT (code) DO NOTHING`);
  await d.execute(`INSERT INTO agents (id, key, name) VALUES ('intelligence', 'INTELLIGENCE', 'Intelligence'), ('safety', 'SAFETY', 'Safety'), ('operations', 'OPERATIONS', 'Operations') ON CONFLICT (key) DO NOTHING`);
  return d;
}
