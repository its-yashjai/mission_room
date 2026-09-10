import { ensureIndex } from "../moss/client";
import { SEED_DOCS, SEED_INCIDENTS } from "../../data/seed/corpus";

async function main() {
  const docs = [
    ...SEED_DOCS.map((d) => ({ id: d.id, text: `[${d.docType} :: ${d.section}] ${d.text}`, metadata: { kind: "doc", docType: d.docType, section: d.section } })),
    ...SEED_INCIDENTS.map((i) => ({ id: `EV-${i.id}`, text: `${i.id}: ${i.event}. Observations: ${i.observations.join("; ")}. Sensor: ${i.sensor}. Assessment: ${i.assessment}. Outcome: ${i.outcome}. Lessons: ${i.lessons}`, metadata: { kind: "incident", incidentId: i.id } })),
  ];
  console.log(`Ingesting ${docs.length} documents into Moss...`);
  await ensureIndex(docs);
  console.log("Moss ingest complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
