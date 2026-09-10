import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit migrate needs a real Postgres. Local dev runtime uses PGlite.
    url: process.env.DATABASE_URL ?? "postgres://mission:mission@localhost:5432/mission_room",
  },
} satisfies Config;
