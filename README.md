# mission_room
Mission Room is a real-time collaborative incident-response workspace where humans and specialized AI agents investigate evolving incidents together. Agents share context, retrieve knowledge through Moss, detect stale findings, reassess conclusions, surface disagreements, identify missing information, and generate evidence-backed reports.

## Quickstart

### A) Zero-setup (default, PGlite — no Docker/Postgres)
PGlite is embedded (see `lib/db/client.ts:13-21`). No daemon needed.

```bash
cp .env.example .env.local  # leave DATABASE_URL commented
npm install
npm run dev # -> http://localhost:3000
```

### B) Docker Postgres (optional, for persistence / drizzle-kit migrate / prod parity)
Requires Docker Desktop running. Host Postgres already on `5432` (native `postgres.exe` detected) — use `5433` if conflict.

```bash
# Start Postgres
npm run db:up        # docker compose up -d (uses 5432:5432; change to 5433:5432 if 5432 busy)
# Or: docker compose up -d

# Configure env
# .env.local -> uncomment: DATABASE_URL=postgres://mission:mission@localhost:5432/mission_room
# If using 5433: DATABASE_URL=postgres://mission:mission@localhost:5433/mission_room

npm run db:migrate  # drizzle-kit migrate needs real Postgres (drizzle.config.ts:8)
npm run dev
npm run db:down     # docker compose down
```

### Env
* `MOSS_PROJECT_ID/KEY` required for real retrieval (https://portal.usemoss.dev)
* `DATABASE_URL` unset -> PGlite; set -> `postgres-js` (`lib/db/client.ts:13`)

## Scripts
`dev` `build` `start` `db:generate` `db:migrate` `db:up` `db:down` `moss:ingest` `moss:test`
