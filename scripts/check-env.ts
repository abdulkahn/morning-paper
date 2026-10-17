// Validates .env.local and checks Supabase connectivity without printing secrets.
// Usage: npm run env:check
import Anthropic from "@anthropic-ai/sdk";
import postgres from "postgres";
import { VOYAGE_MODEL, voyageEmbedder } from "../src/lib/cluster/embedder";
import { parseEnv, type Env } from "../src/lib/env";

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
    LLM_MODE: env.LLM_MODE,
    ANTHROPIC_API_KEY: present(env.ANTHROPIC_API_KEY),
    LLM_WRITER_MODEL: env.LLM_WRITER_MODEL,
    LLM_BULK_MODEL: env.LLM_BULK_MODEL,
    VOYAGE_API_KEY: present(env.VOYAGE_API_KEY),
    GUARDIAN_API_KEY: present(env.GUARDIAN_API_KEY),
  });

  if (process.argv.includes("--ping")) await pingProviders(env);
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

/**
 * Proves the AI keys authenticate with near-zero cost: an Anthropic model
 * lookup (no tokens) and a one-word Voyage embedding. Prints status only.
 */
async function pingProviders(env: Env) {
  if (env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    for (const model of [env.LLM_WRITER_MODEL, env.LLM_BULK_MODEL]) {
      try {
        const m = await client.models.retrieve(model);
        console.log(`anthropic: OK (${m.id} available)`);
      } catch (err) {
        const status =
          err instanceof Anthropic.APIError ? err.status : undefined;
        console.log(
          `anthropic: FAILED for ${model} (HTTP ${status ?? "network error"})`,
        );
      }
    }
  }
  if (env.VOYAGE_API_KEY) {
    try {
      const [v] = await voyageEmbedder(env.VOYAGE_API_KEY).embed([
        { title: "ping", description: null },
      ]);
      console.log(`voyage: OK (${VOYAGE_MODEL}, ${v.length} dims)`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message.replace(/pa-[\w-]+/g, "pa-***") : "";
      console.log(`voyage: FAILED (${msg.slice(0, 80)})`);
    }
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
