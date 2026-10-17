import { AuthForm } from "../auth/auth-form";

export const metadata = { title: "Create your account · The Morning Paper" };

export default function SignUpPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Create your account
      </h1>
      <p className="text-ink-muted mt-2">
        Your editor keeps your papers, archive and reading memory with your
        account, so they follow you to any device.
      </p>
      <AuthForm mode="signup" />
    </main>
  );
}
