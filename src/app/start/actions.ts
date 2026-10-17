"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublicConfig } from "@/lib/supabase/config";

export interface StartState {
  error: string | null;
}

/**
 * Starts (or resumes) a reader: anonymous Supabase sign-in plus an empty
 * profile row, then onboarding. Safe to call repeatedly.
 */
export async function startReader(): Promise<StartState> {
  if (!supabasePublicConfig()) {
    return { error: "Sign-in isn't configured on this deployment yet." };
  }
  const supabase = await createSupabaseServerClient();

  let {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      console.error("[start] anonymous sign-in failed", error?.message);
      return { error: "We couldn't start your paper. Please try again." };
    }
    user = data.user;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[start] profile insert failed", error.message);
    return { error: "We couldn't start your paper. Please try again." };
  }

  redirect("/onboarding");
}
