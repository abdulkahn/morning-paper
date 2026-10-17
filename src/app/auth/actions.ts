"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Email + password accounts (Supabase Auth). Sign-up sends a confirmation
// email; the link lands on /auth/confirm, which signs the reader in and
// creates their profile. Anonymous "Start my paper" readers still work.

export interface AuthState {
  error: string | null;
  info?: string | null;
}

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(40),
  email: z.email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters for your password.")
    .max(72),
});

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Creates (or keeps) the reader's profile row, filling in their name. */
async function ensureProfile(name: string | null) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (name) {
    await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("user_id", user.id)
      .is("display_name", null);
  }
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  if (!supabasePublicConfig())
    return { error: "Sign-up isn't configured yet." };
  const parsed = signUpSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const supabase = await createSupabaseServerClient();
  // A new account replaces any anonymous session in this browser.
  await supabase.auth.signOut();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm`,
    },
  });
  if (error) {
    console.error("[auth] sign-up failed", error.message);
    return {
      error: /rate limit/i.test(error.message)
        ? "Too many sign-ups right now — please try again in a few minutes."
        : error.message,
    };
  }
  // An existing email returns a user with no identities (Supabase hides it).
  if (data.user && data.user.identities?.length === 0) {
    return {
      error: "An account with this email already exists. Please log in.",
    };
  }
  if (data.session) {
    // Email confirmation is switched off in Supabase: signed in straight away.
    await ensureProfile(name);
    redirect("/onboarding");
  }
  return {
    error: null,
    info: `Check ${email} — we've sent you a link to confirm your account. Open it in this browser.`,
  };
}

const logInSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

export async function logIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!supabasePublicConfig()) return { error: "Log-in isn't configured yet." };
  const parsed = logInSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error: /confirm/i.test(error.message)
        ? "Please confirm your email first — check your inbox for our link."
        : "That email and password don't match.",
    };
  }
  await ensureProfile(
    (data.user.user_metadata?.name as string | undefined) ?? null,
  );
  redirect("/today");
}

export async function logOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
