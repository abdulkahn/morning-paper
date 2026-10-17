import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

// Privileged database access for workers, scripts and server-only jobs.
// This connection BYPASSES row-level security — never use it to serve a
// reader's request. Reader-scoped access goes through the Supabase client
// (src/lib/supabase/server.ts) so RLS applies.

let client: postgres.Sql | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!db) {
    const url = getEnv().DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    // prepare:false keeps us compatible with Supabase's transaction pooler.
    // Serverless instances keep a single short-lived connection so many
    // concurrent instances can't exhaust the pooler's client limit.
    const serverless = !!process.env.VERCEL;
    client = postgres(url, {
      max: serverless ? 1 : 5,
      idle_timeout: serverless ? 5 : 30,
      connect_timeout: 10,
      prepare: false,
    });
    db = drizzle(client, { schema });
  }
  return db;
}

export async function closeDb() {
  await client?.end();
  client = undefined;
  db = undefined;
}
