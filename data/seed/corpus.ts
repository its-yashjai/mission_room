// Deterministic fictional seed. Fixed content, no randomness at runtime.
// 10 incidents + 20 docs. All SENTINEL-7 / synthetic. No real-world data.

export type SeedIncident = {
  id: string;
  event: string;
  observations: string[];
  sensor: string;
  assessment: string;
  actions: string[];
  outcome: string;
  lessons: string;
};

export const SEED_INCIDENTS: SeedIncident[] = [
  { id: "INC-011", event: "Unidentified light drone observed near perimeter fence", observations: ["Small quadcopter hovering 40m outside observation zone", "No transponder signal"], sensor: "confidence 74%", assessment: "Likely hobbyist drift; verification requested", actions: ["notify internal security", "request visual verification", "log incident"], outcome: "Resolved / low concern after visual confirmed recreational use nearby", lessons: "Early visual verification shortens assessment" },
  { id: "INC-012", event: "Sensor track with fluctuating confidence", observations: ["Track appeared then faded twice", "Wind gusts reported"], sensor: "confidence 58% -> 66%", assessment: "Sensor degradation suspected", actions: ["check sensor status", "continue logging"], outcome: "Unresolved, closed after no reappearance in 30 min", lessons: "Record sensor status with every confidence change" },
  { id: "INC-014", event: "Observer reports drone moving toward observation zone", observations: ["Object moving slowly eastward", "No audible signature"], sensor: "confidence 81%", assessment: "Unresolved security concern pending verification", actions: ["request visual verification", "notify supervisor"], outcome: "Resolved / low concern after observer confirmed bird flock on thermal", lessons: "Thermal-only tracks need visual before escalation" },
  { id: "INC-018", event: "Historical reference: slow approach, then retreat", observations: ["Unidentified drone detected at dusk", "Moved toward zone then moved away"], sensor: "confidence 79% dropping to 62%", assessment: "Historical evidence supports benign possibility but verification still required", actions: ["visual verification", "supervisor review"], outcome: "Resolved / low concern", lessons: "Retreat behavior correlates with benign outcomes but never conclusive alone" },
  { id: "INC-021", event: "Conflicting observer reports", observations: ["Observer A: drone circling", "Observer B: stationary light"], sensor: "confidence 70%", assessment: "Contradictory evidence; more information required", actions: ["request current location", "request sensor status"], outcome: "Unresolved", lessons: "Conflicting info must be preserved, not averaged away" },
  { id: "INC-023", event: "Sensor degradation during rain", observations: ["Heavy rain, low visibility", "Intermittent track"], sensor: "confidence 55%, status DEGRADED", assessment: "Low confidence due to weather; do not escalate on sensor alone", actions: ["note weather", "continue logging"], outcome: "Unresolved", lessons: "Weather is a first-class context field" },
  { id: "INC-027", event: "Supervisor confirmation drill", observations: ["Scheduled drill with simulated track"], sensor: "confidence 90% (drill injector)", assessment: "Drill; tests escalation workflow only", actions: ["run communication checklist", "no external escalation"], outcome: "Resolved / low concern (drill)", lessons: "Drills must be tagged to avoid polluting history" },
  { id: "INC-031", event: "Boundary threshold crossing (simulated)", observations: ["Track crossed inner observation boundary on display"], sensor: "confidence 83%", assessment: "Elevated concern; approved defensive escalation workflow triggered", actions: ["notify internal security", "supervisor review", "prepare report"], outcome: "Elevated concern; handed to facility supervisor per procedure", lessons: "Boundary crossing requires supervisor, never autonomous action" },
  { id: "INC-035", event: "Night observation with spotlight request", observations: ["Light seen, no shape resolved"], sensor: "confidence 68%", assessment: "Identity not verified; visual confirmation needed", actions: ["request spotlight/visual", "log"], outcome: "Unresolved", lessons: "Unresolved is a valid terminal state when evidence insufficient" },
  { id: "INC-039", event: "Resolved benign overflight", observations: ["Registered survey team notified late"], sensor: "confidence 88%", assessment: "Benign after supervisor confirmation", actions: ["supervisor confirmation", "close with report"], outcome: "Resolved / low concern", lessons: "Late notifications are common; keep communication log" },
];

export type SeedDoc = { id: string; docType: string; section: string; text: string };

export const SEED_DOCS: SeedDoc[] = [
  { id: "DOC-PROC-01", docType: "procedure", section: "Detection response", text: "SENTINEL-7 procedure: on unidentified drone detection, log event, notify internal security, and request visual verification before any boundary action." },
  { id: "DOC-PROC-02", docType: "procedure", section: "Verification", text: "Current procedure requires visual verification before closure. Sensor-only tracks must not close an incident." },
  { id: "DOC-PROC-03", docType: "procedure", section: "Escalation", text: "Escalation to supervisor requires: current location, sensor status, and visual confirmation status. Missing items must be listed as information gaps." },
  { id: "DOC-PROC-04", docType: "procedure", section: "Boundaries", text: "Observation zone vs restricted boundary: crossing the observation zone triggers logging; crossing the restricted boundary triggers supervisor review via approved defensive workflow. No autonomous action permitted." },
  { id: "DOC-SAFE-01", docType: "safety", section: "General", text: "Safety rule: never claim safe or hostile as absolute truth. Represent uncertainty with evidence and confidence." },
  { id: "DOC-SAFE-02", docType: "safety", section: "Weather", text: "Sensor confidence below 65% during rain or high wind must be flagged as possibly degraded. Record weather explicitly." },
  { id: "DOC-SAFE-03", docType: "safety", section: "Night ops", text: "Night observations require spotlight or second observer before verification counts as confirmed." },
  { id: "DOC-SAFE-04", docType: "safety", section: "Prohibited", text: "Prohibited: weapon targeting, interception, attack planning, autonomous offensive decisions. System supports defensive observation and coordination only." },
  { id: "DOC-OPS-01", docType: "operations", section: "Checklist", text: "Safe response checklist: notify internal security, request visual verification, request current location and sensor status, supervisor review, continue logging, prepare report." },
  { id: "DOC-OPS-02", docType: "operations", section: "Comms", text: "Communication workflow: internal security first, then supervisor, then log. No external broadcast without supervisor approval." },
  { id: "DOC-OPS-03", docType: "operations", section: "Closure", text: "Closure requires human approval with: final context version, supporting evidence IDs, and open gaps acknowledged." },
  { id: "DOC-TECH-01", docType: "technical", section: "Sensors", text: "Sensor confidence is a 0-100 estimate combining signal strength and track stability. Changes over 10 points are material and may stale prior findings." },
  { id: "DOC-TECH-02", docType: "technical", section: "Thermal", text: "Thermal-only tracks cannot distinguish small drones from birds at range. Require visual or second sensor." },
  { id: "DOC-TECH-03", docType: "technical", section: "Tracks", text: "Position updates toward the observation zone increase concern but are not conclusive. Retreat behavior often precedes benign resolution but never proves it." },
  { id: "DOC-COMM-01", docType: "communications", section: "Templates", text: "Notify template: INCIDENT id, time, observation, confidence, location, verification status, requested action." },
  { id: "DOC-CLOSE-01", docType: "closure", section: "Report", text: "Final report must cite evidence IDs, timeline, disagreements, human decisions, and outcome class: resolved-low-concern, unresolved, or elevated-concern." },
  { id: "DOC-HIST-18", docType: "historical", section: "INC-018 summary", text: "Incident 018: slow approach at dusk, confidence 79 dropping to 62, moved away. Resolved low concern after visual. Lesson: retreat supports benign possibility; verification still required." },
  { id: "DOC-HIST-14", docType: "historical", section: "INC-014 summary", text: "Incident 014: object moving toward observation zone at 81% confidence. Resolved low concern after thermal track shown to be bird flock. Lesson: require visual." },
  { id: "DOC-HIST-31", docType: "historical", section: "INC-031 summary", text: "Incident 031: simulated boundary crossing at 83%. Elevated concern per procedure, handed to supervisor. No autonomous action." },
  { id: "DOC-POL-01", docType: "policy", section: "Human authority", text: "Policy: AI recommends, backend validates, human approves consequential actions. AI recommendation and human decision are recorded separately." },
];
