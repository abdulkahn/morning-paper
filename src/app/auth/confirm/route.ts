import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Landing page for the confirmation email: exchanges the one-time code for a
// session, creates the reader's profile with the name they signed up with,
// and continues to onboarding.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const supabase = await createSupabaseServerClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
      : { error: new Error("missing code") };

  if (error) {
    console.error("[auth] confirm failed", error.message);
    return NextResponse.redirect(new URL("/login?confirm=failed", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    const name = user.user_metadata?.name;
    if (typeof name === "string" && name.trim()) {
      await supabase
        .from("profiles")
        .update({ display_name: name.trim().slice(0, 40) })
        .eq("user_id", user.id)
        .is("display_name", null);
    }
  }
  return NextResponse.redirect(new URL("/onboarding", url.origin));
}
