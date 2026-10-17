import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicConfig } from "./config";

/**
 * Reader-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. Uses the reader's session cookie, so RLS applies.
 * Create one per request; never share across requests.
 */
export async function createSupabaseServerClient() {
  const config = supabasePublicConfig();
  if (!config) throw new Error("Supabase is not configured");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session instead.
        }
      },
    },
  });
}
