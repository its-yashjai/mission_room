# PHASE 1 PLAN — Core Loop Only (in Y:\drone_war)

Goal: prove `sim event → coordinator parallel fan-out → Moss real retrieval → findings → shared context update`.

No voice. No LiveKit required. No5222 beautiful animations. No 100 docs.

## Folder layout (all inside Y:\drone_war)

```text
Y:\drone_war\
  app\mission-room\[id]\   # minimal workspace page (Phase 1c)
  lib\simulator\           # event generator
  lib\coordinator\         # orchestration + versioning
  lib\agents\              # intelligence / safety / operations prompts+tools
  lib\moss\                # retrieval wrapper, measures real latency ms
  lib\db\                  # Postgres schema + queries
  lib\llm\                 # one LLM, 3 prompts, citation check
  data\seed\               # 20 docs + 10 incidents, fixed seed
  docs\                    # LOCKED_DECISIONS.md, PHASE1_PLAN.md, ARCHITECTURE.md, PRD.md
```

## Phase 1a — State + seed + simulator

- Postgres tables: incidents, events, observations, findings (with based_on_context_version + status ACTIVE/STALE/SUPERSEDED), hypotheses, actions, decisions, timeline, reports.
- Seed: 10 fictional incidents (event/observations/sensor/assessment/actions/outcome/lessons), 20 docs (procedures/safety/technical/operations/communications/closure). Deterministic, fixed seed. No filler.
- Moss ingest: all seed searchable. Record evidence_id mapping.
- Simulator: typed events DRONE_DETECTED, POSITION_UPDATED, DETECTION_CONFIDENCE_CHANGED, VISUAL_CONFIRMATION, SENSOR_DEGRADATION, NEW_OBSERVATION, CONFLICTING_INFORMATION, BOUNDARY_STATUS_CHANGED, SUPERVISOR_CONFIRMATION, INCIDENT_RESOLVED. Supports playback/pause/resume/reset/manual inject/speed 0.5x/1x/2x/5x/10x. Validates then appends to DB + timeline, bumps context_version on material change.
- Test: emit INCIDENT-042 script, verify timeline + version increments.

## Phase 1b — Coordinator + agents (backend only)

- Coordinator: receives event, picks relevant agents, runs independent agents in parallel, collects findings, updates shared context, enforces approval gate. No agent-to-agent chat, structured findings only.
- Intelligence: Moss search historical/contextual. Output: finding + confidence + supporting + contradictory + needed. Never invent sources.
- Safety: Moss retrieve procedures/escalation/verification. Defensive only.
- Operations: safe checklist only (notify security, request verification/info, supervisor review, logging, prepare report).
- LLM wrapper: compact context slice, structured output validation, citation must map to real Moss evidence_id, else reject. Fail closed: "AI analysis unavailable".
- Moss wrapper: parallel searches, evidence cache by query hash, records real latency ms, fail closed: "Evidence retrieval unavailable".
- Test: one DRONE_DETECTED → 3 parallel findings → context v+1. Verify parallel timing + citations.

## Phase 1c — Minimal UI to prove loop

- One page `app/mission-room/[id]`: TOP (id/status/phase), LEFT (roster status/task/confidence), CENTER (current event + timeline), RIGHT (evidence + findings + hypotheses), BOTTOM (text input + add observation).
- Streaming: EVENT RECEIVED → CONTEXT UPDATED → INVESTIGATING immediately; findings appear async. Never block on slowest agent.
- Evidence card: source, doc type, section, excerpt, why-retrieved, real Moss ms. Never fake.
- Test: manual script walkthrough matches main demo start.

## Phase 2 (not now)

New event → dependency diff → mark STALE → targeted reassess → new finding on new version, old preserved.

## Phase 3 (not now)

Disagreement banner + INFORMATION NEEDED → human input → reassess → safe checklist → human approval → resolution → report + replay.

## Acceptance for Phase 1

- [ ] INCIDENT-042 auto-play emits events, timeline updates, context_version increments.
- [ ] 3 agents run in parallel, each returns structured finding with real Moss evidence_id + measured ms.
- [ ] Shared context shows latest findings/hypotheses/open actions.
- [ ] No invented incidents, no fake latency, fail-closed banners work.
- [ ] All files under Y:\drone_war; no secrets committed (.env.example only).

## Open tech choices (resolved)

- ORM: Drizzle + PGlite (dev, zero-setup, no Docker) / Postgres via DATABASE_URL (prod/Docker). See lib/db/client.ts:13-21, drizzle.config.ts:8, docker-compose.yml. Default is A (PGlite); B (Docker Postgres) is optional via `npm run db:up`.
- LLM: reuse opencode auth model vs explicit OPENAI/ANTHROPIC key.
- Moss: endpoint/key/collection vs interface-first with Postgres FTS interim.
- UI: minimal debug page first vs full roster layout stub.
