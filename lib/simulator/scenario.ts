// INCIDENT-042 script. Event-based, not physics. Times are relative offsets (s).
export type SimEvent = { atSec: number; type: string; payload: Record<string, unknown> };

export const INCIDENT_042: SimEvent[] = [
  { atSec: 0, type: "DRONE_DETECTED", payload: { text: "Unknown drone detected near SENTINEL-7 observation zone" } },
  { atSec: 5, type: "DETECTION_CONFIDENCE_CHANGED", payload: { confidence: 81, sensorStatus: "NOMINAL" } },
  { atSec: 15, type: "POSITION_UPDATED", payload: { text: "Object moving toward observation zone", direction: "toward-observation-zone" } },
  { atSec: 25, type: "NEW_OBSERVATION", payload: { text: "Visual verification requested", source: "OPERATIONS" } },
  { atSec: 40, type: "VISUAL_CONFIRMATION", payload: { text: "Visual confirmation received (shape unresolved)", confirmed: false } },
  { atSec: 55, type: "DETECTION_CONFIDENCE_CHANGED", payload: { confidence: 64, sensorStatus: "DEGRADED", note: "Sensor confidence drops" } },
  { atSec: 70, type: "NEW_OBSERVATION", payload: { text: "Observer says the drone is moving away", source: "HUMAN" } },
];

export const SPEEDS = [0.5, 1, 2, 5, 10] as const;
