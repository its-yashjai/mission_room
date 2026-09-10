# MISSION ROOM — LOCKED DECISIONS

Approved: 2026-09-10. All work in `Y:\drone_war` only.

## One-line understanding (approved)

Simulator = changing events → Coordinator = orchestration → Agents = specialized investigation → Moss = evidence retrieval → PostgreSQL = operational truth → LLM = interpretation/synthesis → shared context = memory → human = final decision.

## Two corrections to core review (locked)

1. **LLM is not synthesis-only.** LLM also interprets retrieved evidence, formulates findings, identifies information gaps, and proposes hypotheses. It is NOT source of truth and does NOT control business rules.
2. **LiveKit = realtime collaboration + optional voice.** Voice is not core dependency. Core product must work through UI if voice is unavailable.

## 12 ambiguities — resolved

| # | Decision | Final choice |
|---|----------|--------------|
| 1 | Exact first scenario | Simulated drone intrusion near fictional SENTINEL-7 |
| 2 | Only about drones? | No. Drone is demo vertical; incident engine is generic |
| 3 | Number of agents | 3 specialists + 1 lightweight Coordinator/orchestrator |
| 4 | Specialists | Intelligence, Safety, Operations |
| 5 | LLM approach | One capable LLM initially; separate prompts/tools per agent |
| 6 | Data size | Start ~20 docs + 10 incidents; scale to ~200 docs + ~100 incidents |
| 7 | Knowledge storage | PostgreSQL = structured state; Moss = searchable knowledge/evidence |
| 8 | Simulation | Event-based simulator, not physics/flight simulator |
| 9 | Realtime | LiveKit for shared realtime updates; voice after core workflow works |
| 10 | Human authority | AI recommends; backend validates; human approves consequential actions |
| 11 | Safety classification | Never claim safe/hostile as absolute truth; represent uncertainty + evidence |
| 12 | Main demo | Detection → parallel investigation → evidence → changing event → stale → reassessment → disagreement/gap → human input → safe approved response → report/replay |

## Locked architecture

```text
                 SIMULATOR
                     │
                     ▼
                INCIDENT EVENT
                     │
                     ▼
              INCIDENT STATE
               PostgreSQL
                     │
                     ▼
                COORDINATOR
          ┌──────────┼──────────┐
          ▼          ▼          ▼
   Intelligence   Safety   Operations
          │          │          │
          └──────────┼──────────┘
                     ▼
                    MOSS
                     │
                     ▼
                 EVIDENCE
                     │
                     ▼
             LLM INTERPRETATION
                     │
                     ▼
              STRUCTURED FINDINGS
                     │
                     ▼
              SHARED CONTEXT
                     │
             ┌───────┴────────┐
             ▼                ▼
        AGREEMENT         DISAGREEMENT
             │                │
             │          INFORMATION GAP
             │                │
             └────────┬───────┘
                      ▼
                 HUMAN INPUT
                      ▼
                AI RECOMMENDATION
                      ▼
                 HUMAN APPROVAL
                      ▼
                  RESOLUTION
                      ▼
              REPORT + REPLAY
```

## Most important technical rule

Do not let LLM decide truth.

- LLM: "72% chance benign" = agent assessment only.
- Authoritative facts only from: PostgreSQL (`context_version`, `human_approved`), Backend (state transitions, stale), Moss (`evidence_id` + content).
- LLM may recommend (e.g. request visual verification). Only backend decides if permitted. Human approves consequential actions.

## Three outcome classes (simulator)

- 🟢 Resolved / low concern — enough evidence supports benign resolution.
- 🟡 Unresolved — evidence insufficient or contradictory.
- 🔴 Elevated concern — multiple indicators require facility approved defensive escalation workflow.

Must NOT become real-world threat classifier. Must NOT generate offensive actions.

## Safety boundary (locked)

Defensive only: detection, observation, classification uncertainty, evidence retrieval, historical comparison, safety/escalation/communication workflow, decision support, reporting, replay.

Explicitly NOT: weapon targeting, target selection, attack planning/optimization/trajectories, weapon control, harm optimization, autonomous offensive decisions, instructions for harming people or disabling aircraft.

All facility/incident/procedure/report data is fictional/synthetic.

## Out of scope for V1

computer vision, autonomous drone tracking, real maps, real external sensor feeds, real defense data, weapon/interception logic, 5-10 agents, complex multi-agent conversations, custom vector DB, Kubernetes/microservices, enterprise auth, mobile app.

## Hackathon fit

- Event: YC Fall 2026 x Moss — Zero Latency Builder Sprint.
- Track: 2. Multiplayer AI and Collaborative Agents (primary). Track 4 reliability as bonus.
- Latency story: 3 agents querying in parallel on every change; Moss sub-10ms keeps reassessment ahead of next event. Must display real measured ms, never fake.
- Submission needs: Architecture Diagram, PRD, GitHub repo, Deployed Link, Video Demo by 2026-09-20 11:59 PM IST.
