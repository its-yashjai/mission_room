import { searchMoss } from "./client";

async function main() {
  const q = process.argv[2] ?? "unidentified drone moving toward observation zone";
  const t0 = performance.now();
  const hits = await searchMoss(q, 5);
  const total = performance.now() - t0;
  console.log(`Query: ${q}`);
  console.log(`Total (incl. load): ${total.toFixed(1)}ms`);
  for (const h of hits) {
    console.log(`- ${h.id} score=${h.score?.toFixed(3)} latencyMs=${h.latencyMs.toFixed(1)} :: ${h.text.slice(0, 140)}`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
