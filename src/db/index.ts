import { mkdirSync } from "node:fs";
import path from "node:path";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type DB = NeonHttpDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __daybriefDb?: Promise<DB> };

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(url, { schema });
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production");
  }
  // Local development without a hosted database: an embedded Postgres on disk.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (dir !== "memory") mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir === "memory" ? undefined : dir);
  const local = drizzle(client, { schema });
  await migrate(local, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return local as unknown as DB;
}

/** Neon in production; an embedded on-disk Postgres when DATABASE_URL is unset in dev. */
export function getDb(): Promise<DB> {
  return (globalForDb.__daybriefDb ??= connect());
}

export { schema };
