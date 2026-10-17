import { z } from "zod";

// Every external service is optional until the milestone that needs it,
// so the app (and CI) always boots in fixture mode with no secrets.
const envSchema = z
  .object({
    LLM_MODE: z.enum(["live", "fixture"]).default("fixture"),
    DEMO_MODE: z.stringbool().default(false),

    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    LLM_WRITER_MODEL: z.string().min(1).default("claude-opus-5-5"),
    LLM_BULK_MODEL: z.string().min(1).default("claude-haiku-5-5"),

    VOYAGE_API_KEY: z.string().min(1).optional(),
    GUARDIAN_API_KEY: z.string().min(1).optional(),

    NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.url().optional(),

    CRON_SECRET: z.string().min(16).optional(),
  })
  .refine((e) => e.LLM_MODE === "fixture" || !!e.ANTHROPIC_API_KEY, {
    message: "ANTHROPIC_API_KEY is required when LLM_MODE=live",
    path: ["ANTHROPIC_API_KEY"],
  });

export type Env = z.infer<typeof envSchema>;

/** Parse an env-like record. Empty strings are treated as unset. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, v]) => v !== undefined && v !== ""),
  );
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Server-side config. Never import this from client components. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
