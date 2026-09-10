import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mission Room" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#0b0f14", color: "#e6edf3" }}>
        {children}
      </body>
    </html>
  );
}
