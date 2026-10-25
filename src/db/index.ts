import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * SSL settings:
 * - DATABASE_SSL=disable   → no SSL (local Postgres / docker)
 * - DATABASE_SSL_CA=<pem>  → verify the server certificate (recommended in production;
 *                            Supabase provides the CA in Project Settings → Database)
 * - default                → SSL without certificate verification (Supabase pooler default)
 */
function sslConfig(): PoolConfig["ssl"] {
  if (process.env.DATABASE_SSL === "disable") return false;
  const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n");
  if (ca) return { ca, rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

const globalForDb = globalThis as typeof globalThis & {
  __ecoverifyPool?: Pool;
};

export const pool =
  globalForDb.__ecoverifyPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: sslConfig(),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ecoverifyPool = pool;
}

export const db = drizzle(pool, { schema });
