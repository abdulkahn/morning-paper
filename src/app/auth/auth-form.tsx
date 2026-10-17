"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn, signUp, type AuthState } from "./actions";

type Typed = { email?: string; name?: string };
const initial: AuthState & Typed = { error: null, info: null };
const input =
  "border-rule bg-paper mt-1 block w-full rounded-md border px-3 py-2";

export function AuthForm({
  mode,
  notice,
}: {
  mode: "signup" | "login";
  notice?: string | null;
}) {
  // React resets the form after each submission; keep what the reader typed
  // (never the password) so a failed attempt doesn't wipe their email.
  const [state, action, pending] = useActionState(
    async (prev: AuthState & Typed, form: FormData) => ({
      ...(await (mode === "signup" ? signUp : logIn)(prev, form)),
      email: String(form.get("email") ?? ""),
      name: String(form.get("name") ?? ""),
    }),
    initial,
  );

  if (state.info) {
    return (
      <p
        role="status"
        className="border-rule mt-8 rounded-md border p-4"
        data-testid="auth-info"
      >
        {state.info}
      </p>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-4">
      {notice ? (
        <p role="alert" className="text-accent text-sm">
          {notice}
        </p>
      ) : null}
      {mode === "signup" ? (
        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            defaultValue={state.name}
            maxLength={40}
            autoComplete="name"
            className={input}
          />
        </label>
      ) : null}
      <label className="block text-sm font-medium">
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={state.email}
          autoComplete="email"
          className={input}
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : 1}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className={input}
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-accent text-sm">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper w-full rounded-md px-6 py-3 text-sm font-medium disabled:opacity-60"
      >
        {pending
          ? "Please wait…"
          : mode === "signup"
            ? "Create my account"
            : "Log in"}
      </button>
      <p className="text-ink-muted text-center text-sm">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="underline underline-offset-4">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
