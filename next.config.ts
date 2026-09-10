import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@moss-dev/moss", "@moss-dev/moss-core", "@electric-sql/pglite"],
};

export default nextConfig;
