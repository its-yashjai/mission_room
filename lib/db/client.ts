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
  await d.execute(`CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, facility TEXT NOT NULL DEFAULT 'SENTINEL-7', title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'INVESTIGATING', phase TEXT NOT NULL DEFAULT 'ASSESSING', severity TEXT NOT NULL DEFAULT 'UNKNOWN', context_version INTEGER NOT NULL DEFAULT 1, shared_context JSONB NOT NULL DEFAULT '{}', outcome TEXT, created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, type TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}', context_version INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS observations (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, source TEXT NOT NULL, text TEXT NOT NULL, context_version INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, agent TEXT NOT NULL, finding TEXT NOT NULL, confidence REAL NOT NULL, supporting_evidence JSONB NOT NULL DEFAULT '[]', contradictory_evidence JSONB NOT NULL DEFAULT '[]', information_needed JSONB NOT NULL DEFAULT '[]', based_on_context_version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', depends_on JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, finding_id TEXT, source TEXT NOT NULL, doc_type TEXT NOT NULL, section TEXT NOT NULL DEFAULT '', excerpt TEXT NOT NULL, score REAL, latency_ms REAL NOT NULL, why_retrieved TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS timeline (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, ref_id TEXT, context_version INTEGER, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await d.execute(`CREATE TABLE IF NOT EXISTS decisions (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, kind TEXT NOT NULL, summary TEXT NOT NULL, approved JSONB, context_version INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  return d;
}
