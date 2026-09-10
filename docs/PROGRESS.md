# PROGRESS — Mission Room (Y:\drone_war)

> Last updated: 2026-09-11 02:30. Branch: main. Remote: https://github.com/its-yashjai/mission_room.git. Latest local before this doc: 7194c0d.

## What is done
- **Repo initialized + pushed**: `aa9ff8b Initial commit` -> `84d3046 docs: lock decisions` -> `b592f05 feat: initial implementation` -> `fb20a0e feat: hybrid DB setup` -> `7194c0d docs: PROGRESS` (all on `origin/main`)
- **Core app scaffold**: `app/page.tsx`, `app/layout.tsx`, `app/mission-room/[id]/page.tsx`, `app/api/{incident,investigate,simulate}/route.ts:1`
- **DB layer (v1 denormalized)**: `lib/db/schema.ts:1` (7 tables), `lib/db/client.ts:13-21` dual-mode (PGlite default, postgres-js when DATABASE_URL set), `drizzle.config.ts:8`
- **Coordinator + agents**: `lib/coordinator/orchestrator.ts:1`, `lib/agents/runners.ts:1`, `lib/context/store.ts:1`
- **Moss + simulator + seed**: `lib/moss/{client,ingest,test}.ts:1`, `lib/simulator/scenario.ts:1`, `data/seed/corpus.ts:1`
- **Hybrid DB setup (A+B)**: `docker-compose.yml:1` (postgres:16-alpine, mission:mission/mission_room, pgdata, healthcheck, 5432:5432 with 5433 fallback note), `.env.example:7` (DATABASE_URL commented, A/B guidance), `README.md:4` (Quickstart A zero-setup + B Docker), `package.json:10` scripts `db:up`/`db:down`, `docs/PHASE1_PLAN.md:63` ORM resolved to Drizzle+PGlite/prod Postgres
- **Build verified (pre-normalization)**: `npm run build` ✓ 7/7 pages, `docker compose config` OK, native `postgres.exe` on 5432, `git status` clean after removing `nul`/`tsconfig.tsbuildinfo` (ignored via `.gitignore:7-8`)
- **Schema normalization (2026-09-11)**: `lib/db/schema.ts:1` rewritten from 7 → 22 tables, authoritative. New tables: `users`, `facilities`, `agents`, `documents`, `incidents` (+facilityId/incidentCode), `incident_participants`, `incident_agents`, `events` (+source/sequence), `observations` (+sourceType/eventId), `sensor_events`, `evidence` (+documentId/citation/retrievalQuery), `findings` (+agentId/title), `finding_evidence`, `finding_dependencies`, `hypotheses`, `hypothesis_evidence`, `actions`, `decisions` (+actionId/decidedBy), `incident_events` (+eventType/actor), `agent_runs`, `reports`. Keeps legacy columns (`sharedContext`, `supportingEvidence` jsonb, `timeline` alias = `incident_events`) for backward compat. `lib/db/client.ts:24` `initDb` now creates all 22 tables + seeds `facilities:fac-sentinel-7` + `agents:intelligence/safety/operations`. `lib/agents/runners.ts:1` now writes normalized `findingEvidence`/`findingDependencies`/`agentRuns` + `evidence.retrievalQuery`. `lib/context/store.ts:22` uses `facilityId`, inserts `sensor_events`, dual `timeline`/`incident_events`. `lib/coordinator/orchestrator.ts:35` adds `eventType`.
  - Verified: `initDb` ok → 22 tables `users,facilities,agents,documents,incidents,incident_participants,incident_agents,events,observations,sensor_events,evidence,findings,finding_evidence,finding_dependencies,hypotheses,hypothesis_evidence,actions,decisions,incident_events,timeline,agent_runs,reports`, `npm run build` ✓ 19.2s 7/7, PGlite `investigate` fail-closed (3 failed without MOSS keys) works.

## What to do next (per PHASE1_PLAN.md, now unblocked by normalized schema)
- **Phase 1a**: Seed `users`/`facilities`/`agents` already auto-seeded in `initDb`; populate `documents` from `data/seed/corpus.ts` (20 docs) + 10 incidents via `incident_participants`, verify `context_version` bumps + `incident_events` replay log (dual `timeline` compat)
- **Phase 1b**: Coordinator parallel fan-out now writes `agent_runs` (latencyMs) + `finding_evidence` (SUPPORTING/CONTRADICTING) + `finding_dependencies` (stale detection); Moss real retrieval measured ms, citation validation (`evidence` -> `documents` -> `findingEvidence`), fail-closed banners remain
- **Phase 1c**: Minimal UI `app/mission-room/[id]` can now query normalized `findings`/`hypotheses`/`actions`/`evidence` via `incidentId` joins; `getIncidentContext()` should be built from authoritative tables (not `sharedContext` jsonb)
- **Hackathon minimal viable schema** (already present, no extra work): `incidents`, `events`, `observations`, `findings`, `finding_evidence`, `evidence`, `documents`, `incident_events`/`timeline`, `agent_runs`, `users`, `facilities`, `agents`. Defer full `hypotheses`/`hypothesis_evidence`/`actions`/`decisions`/`reports`/`sensor_events` population until Phase 2/3, but tables exist.
- **Later**: Phase 2 stale (query `finding_dependencies` on new `events`/`observations`/`sensor_events` → mark `findings.status=STALE`), Phase 3 disagreement (`hypotheses` + `hypothesis_evidence`), human-approval (`actions` + `decisions` + `incident_participants`), report (`reports`), replay (`incident_events` ordered)
- **Operational**: Need `MOSS_PROJECT_ID/KEY` for real retrieval, decide LLM key vs opencode auth, set `DATABASE_URL` only if using Docker/prod Postgres (`npm run db:up` + `npm run db:migrate`); PGlite still default

## How to resume
```bash
cd Y:\drone_war
git status # should be clean on <latest commit after normalization>
cat .env.example # DATABASE_URL commented = PGlite (A) or uncomment for Docker (B)
cat lib/db/schema.ts # 22 tables, timeline alias = incident_events
npm run build # must be ✓ 7/7
node -e "import('./lib/db/client.ts').then(async m=>{await m.initDb(); console.log('22 tables')})"
npm run dev # or npm run db:up && npm run db:migrate if Postgres needed
```

## Notes
- `.gitignore:1` covers `.next/`, `node_modules/`, `.env.local`, `*.db`, `drizzle/*.sql`, `tsconfig.tsbuildinfo`, `nul`
- Docker daemon was not running last check (2026-09-11) but `docker --version 29.6.2` installed; `docker compose up -d` still valid when started
- No secrets committed; `.env.example` only

