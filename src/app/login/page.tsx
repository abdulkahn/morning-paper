import { Suspense } from "react";
import { AuthForm } from "../auth/auth-form";

export const metadata = { title: "Log in · The Morning Paper" };

export default function LogInPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight">Log in</h1>
      <p className="text-ink-muted mt-2">Welcome back to your morning paper.</p>
      <Suspense fallback={<AuthForm mode="login" />}>
        <LogInForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LogInForm({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { confirm } = await searchParams;
  return (
    <AuthForm
      mode="login"
      notice={
        confirm === "failed"
          ? "That confirmation link didn't work or has expired. Log in, or sign up again for a fresh link."
          : null
      }
    />
  );
}
