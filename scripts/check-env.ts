// Validates .env.local and checks Supabase connectivity without printing secrets.
// Usage: npm run env:check
import postgres from "postgres";
import { parseEnv } from "../src/lib/env";

async function main() {
  const env = parseEnv(process.env);
  const present = (v: unknown) => (v ? "set" : "missing");
  console.log("env parsed OK");
  console.log({
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(env.NEXT_PUBLIC_SUPABASE_URL).host
      : "missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: present(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: present(env.SUPABASE_SERVICE_ROLE_KEY),
    DATABASE_URL: env.DATABASE_URL ? new URL(env.DATABASE_URL).host : "missing",
  });

  if (!env.DATABASE_URL) return;
  const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
  try {
    const [{ version }] = await sql`select version()`;
    console.log("db:", String(version).split(" ").slice(0, 2).join(" "));
    const ext =
      await sql`select extname, extversion from pg_extension where extname = 'vector'`;
    console.log("pgvector:", ext.length ? ext[0].extversion : "not enabled");
    const tables = await sql`
      select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`;
    console.log(
      "public tables:",
      tables.length ? tables.map((t) => t.table_name).join(", ") : "(none)",
    );
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
