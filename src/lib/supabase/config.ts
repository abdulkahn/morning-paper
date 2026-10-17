// Public Supabase settings. NEXT_PUBLIC_* values are inlined at build time,
// so read them with literal property access.
export function supabasePublicConfig(): {
  url: string;
  anonKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}
