import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PaperView } from "@/components/paper/paper-view";
import { ThreeThings } from "@/components/paper/three-things";
import { getOrBuildEdition } from "@/lib/edition/build";
import { supabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Today’s Paper · The Morning Paper" };

export default function TodayPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center">
          <p className="font-display text-3xl font-bold">
            Building your paper…
          </p>
          <p className="text-ink-muted mt-3">
            Ranking today&rsquo;s stories for you, checking what you&rsquo;ve
            already read, and writing your editor&rsquo;s note.
          </p>
        </main>
      }
    >
      <Today />
    </Suspense>
  );
}

async function Today() {
  await connection();
  // Without Supabase (e.g. CI) there are no readers: send visitors home.
  if (!supabasePublicConfig()) redirect("/");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("user_id", user.id)
    .single();
  if (!profile?.onboarded_at) redirect("/onboarding");

  const { id, snapshot } = await getOrBuildEdition(user.id);
  return (
    <PaperView
      edition={snapshot}
      storyHref={`/story/${id}`}
      context={{
        archived: false,
        archiveHref: "/archive",
        todayHref: "/today",
        pdfAvailable: true,
      }}
      extra={
        <>
          <ThreeThings editionId={id} items={snapshot.recall} />
          <p className="mt-10 text-center text-sm">
            <Link href="/editor" className="underline underline-offset-4">
              See what your editor has learned about you, or tell it what you
              want →
            </Link>
          </p>
        </>
      }
    />
  );
}
