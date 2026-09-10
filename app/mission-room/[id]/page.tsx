"use client";
import { useEffect, useState } from "react";
import { INCIDENT_042 } from "@/lib/simulator/scenario";

type Ctx = {
  incidentId: string; facility: string; phase: string; status: string;
  observations: string[]; sensor: { confidence: number | null; status: string };
  latestFindings: { agent: string; finding: string; confidence: number }[];
  hypotheses: { label: string; confidence: number }[];
  openActions: string[]; contextVersion: number;
};

export default function MissionRoom() {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    const r = await fetch("/api/incident").then((x) => x.json());
    if (r.ok) setCtx(r.context);
    else setErr(r.error);
  }
  useEffect(() => { fetch("/api/incident", { method: "POST" }).then(refresh); }, []);

  async function step(i: number) {
    setBusy(true); setErr("");
    try {
      const ev = INCIDENT_042[i];
      const s = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: ev.type, payload: ev.payload }) }).then((x) => x.json());
      if (!s.ok) throw new Error(s.error);
      setLog((l) => [...l, `EVENT ${ev.type} -> ctx v${s.version}`]);
      const inv = await fetch("/api/investigate", { method: "POST" }).then((x) => x.json());
      if (!inv.ok) throw new Error(inv.error);
      setLog((l) => [...l, `INVESTIGATED @v${inv.version}: ${inv.results.length} findings`]);
      setCtx(inv.context);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <header>
        <h1>INCIDENT #042 — SIMULATED DRONE INTRUSION — SENTINEL-7</h1>
        <div>STATUS: {ctx?.status} | PHASE: {ctx?.phase} | CTX v{ctx?.contextVersion} | SENSOR: {ctx?.sensor.confidence ?? "?"}% ({ctx?.sensor.status})</div>
      </header>
      {err && <div style={{ background: "#3d1111", padding: 12 }}>{err}</div>}
      <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {INCIDENT_042.map((e, i) => (
          <button key={i} disabled={busy} onClick={() => step(i)}>{i}: {e.type}</button>
        ))}
        <button disabled={busy} onClick={refresh}>Refresh</button>
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3>Observations</h3>
          <ul>{ctx?.observations.map((o, i) => <li key={i}>{o}</li>)}</ul>
          <h3>Hypotheses (uncertain, never absolute)</h3>
          <ul>{ctx?.hypotheses.map((h) => <li key={h.label}>{h.label}: {h.confidence}%</li>)}</ul>
          <h3>Open actions / gaps</h3>
          <ul>{ctx?.openActions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
        <div>
          <h3>Latest findings</h3>
          <ul>{ctx?.latestFindings.map((f, i) => <li key={i}><b>{f.agent}</b> ({Math.round(f.confidence * 100)}%): {f.finding}</li>)}</ul>
          <h3>Log</h3>
          <ul>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      </section>
    </main>
  );
}
