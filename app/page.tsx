import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 32 }}>
      <h1>MISSION ROOM</h1>
      <p>Collaborative realtime incident-response workspace (demo: SENTINEL-7 / INCIDENT-042).</p>
      <Link href="/mission-room/042" style={{ color: "#58a6ff" }}>Open /mission-room/042</Link>
    </main>
  );
}
