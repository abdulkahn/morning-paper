import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Your editor · The Morning Paper" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
      <p className="text-ink-muted text-xs font-medium tracking-[0.04em] uppercase">
        Meet your editor
      </p>
      <h1 className="font-display mt-2 text-4xl font-bold tracking-tight">
        Let&rsquo;s build your first paper.
      </h1>
      <Suspense
        fallback={<p className="text-ink-muted mt-6">Opening your file…</p>}
      >
        <ReaderStatus />
      </Suspense>
    </main>
  );
}

async function ReaderStatus() {
  // Per-reader content: render at request time, never prerender.
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("reading_minutes")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="mt-6 space-y-2">
      <p data-testid="reader-ready">
        Your reader file is open
        {profile ? ` · ${profile.reading_minutes}-minute paper` : ""}.
      </p>
      <p className="text-ink-muted text-sm">
        Headline choices that shape your paper arrive in the next build.
      </p>
    </div>
  );
}
