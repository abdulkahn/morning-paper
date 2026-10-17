import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Runs against the real Supabase project in .env.local; skipped when it's
// not configured (e.g. CI). Creates two anonymous readers and deletes them.

try {
  process.loadEnvFile(".env.local");
} catch {
  // not configured locally
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = !!(url && anonKey && serviceKey);

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

async function anonymousReader() {
  const client = createClient(url!, anonKey!, clientOptions);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error("no user");
  return { client, id: data.user.id };
}

describe.skipIf(!configured)("row-level security", () => {
  let a: { client: SupabaseClient; id: string };
  let b: { client: SupabaseClient; id: string };
  let admin: SupabaseClient;

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, clientOptions);
    a = await anonymousReader();
    b = await anonymousReader();
    for (const r of [a, b]) {
      const { error } = await r.client
        .from("profiles")
        .insert({ user_id: r.id });
      expect(error).toBeNull();
    }
  }, 30_000);

  afterAll(async () => {
    // Profiles, weights and events cascade from auth.users.
    for (const r of [a, b]) if (r) await admin.auth.admin.deleteUser(r.id);
  });

  it("lets a reader read only their own profile", async () => {
    const own = await a.client.from("profiles").select("user_id");
    expect(own.error).toBeNull();
    expect(own.data?.map((p) => p.user_id)).toEqual([a.id]);

    const other = await a.client
      .from("profiles")
      .select("user_id")
      .eq("user_id", b.id);
    expect(other.data).toEqual([]);
  });

  it("blocks creating or editing another reader's rows", async () => {
    const forged = await a.client
      .from("user_topic_base")
      .insert({ user_id: b.id, topic_slug: "ai", base_weight: 0.9 });
    expect(forged.error).not.toBeNull();

    const edit = await a.client
      .from("profiles")
      .update({ reading_minutes: 25 })
      .eq("user_id", b.id)
      .select();
    expect(edit.data).toEqual([]);
  });

  it("keeps events append-only and private", async () => {
    const insert = await a.client
      .from("events")
      .insert({ user_id: a.id, type: "pair_choice", topic_slug: "robotics" });
    expect(insert.error).toBeNull();

    const forged = await a.client
      .from("events")
      .insert({ user_id: b.id, type: "story_open" });
    expect(forged.error).not.toBeNull();

    const badType = await a.client
      .from("events")
      .insert({ user_id: a.id, type: "hack" });
    expect(badType.error).not.toBeNull();

    const del = await a.client.from("events").delete().eq("user_id", a.id);
    expect(del.error).not.toBeNull();

    const seenByB = await b.client.from("events").select("id");
    expect(seenByB.data).toEqual([]);
  });

  it("serves topics to everyone, read-only", async () => {
    const anon = createClient(url!, anonKey!, clientOptions);
    const { data } = await anon.from("topics").select("slug");
    expect(data?.length).toBeGreaterThanOrEqual(17);

    const write = await a.client
      .from("topics")
      .insert({ slug: "x", name: "X" });
    expect(write.error).not.toBeNull();
  });

  it("enforces profile constraints", async () => {
    const { error } = await a.client
      .from("profiles")
      .update({ reading_minutes: 7 })
      .eq("user_id", a.id);
    expect(error).not.toBeNull();
  });
});
