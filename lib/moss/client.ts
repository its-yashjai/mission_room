import { MossClient } from "@moss-dev/moss";

export type MossHit = {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
  latencyMs: number;
};

let client: MossClient | null = null;
let indexReady: Promise<unknown> | null = null;

function getIndexName() {
  return process.env.MOSS_INDEX_NAME ?? "mission-room-knowledge";
}

export function isMossConfigured() {
  return Boolean(process.env.MOSS_PROJECT_ID && process.env.MOSS_PROJECT_KEY);
}

function getClient() {
  if (!isMossConfigured()) return null;
  if (!client) {
    client = new MossClient(process.env.MOSS_PROJECT_ID!, process.env.MOSS_PROJECT_KEY!);
  }
  return client;
}

// Real Moss retrieval. Never fake latency/scores. Throws if unconfigured.
export async function searchMoss(query: string, topK = 5): Promise<MossHit[]> {
  const c = getClient();
  if (!c) throw new Error("Evidence retrieval unavailable (MOSS_PROJECT_ID/KEY missing).");
  const indexName = getIndexName();
  if (!indexReady) indexReady = c.loadIndex(indexName);
  await indexReady;
  const t0 = performance.now();
  const res = await c.query(indexName, query, { topK });
  const latencyMs = performance.now() - t0;
  return res.docs.map((d) => ({
    id: d.id,
    text: d.text,
    score: d.score,
    metadata: (d.metadata ?? {}) as Record<string, unknown>,
    latencyMs,
  }));
}

export async function ensureIndex(documents: { id: string; text: string; metadata?: Record<string, string> }[]) {
  const c = getClient();
  if (!c) throw new Error("Evidence retrieval unavailable (MOSS_PROJECT_ID/KEY missing).");
  const indexName = getIndexName();
  const docs = documents.map((d) => ({
    id: d.id,
    text: d.text,
    metadata: Object.fromEntries(Object.entries(d.metadata ?? {}).map(([k, v]) => [k, String(v)])),
  }));
  try {
    await c.createIndex(indexName, docs);
  } catch (e) {
    // Index may already exist — fall through to addDocs.
    const msg = e instanceof Error ? e.message : String(e);
    if (!/already|exists/i.test(msg)) throw e;
    await c.addDocs(indexName, docs);
  }
  indexReady = c.loadIndex(indexName);
  await indexReady;
}
