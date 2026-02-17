import Link from "next/link";

import { signup } from "@/app/actions/auth";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  missing_credentials: "Email and password are required.",
  signup_failed: "Could not create account. Try a different email.",
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Create account</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Set up your Supabase Auth account to access protected routes.
      </p>

      {errorMessage ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <form action={signup} className="space-y-3 rounded-lg border border-zinc-200 p-5">
        <label className="block text-sm font-medium text-zinc-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          required
        />
        <label className="block text-sm font-medium text-zinc-700" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          minLength={8}
          required
        />
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Create account
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/login" className="text-zinc-600 underline">
          Back to login
        </Link>
        <Link href="/" className="text-zinc-600 underline">
          Home
        </Link>
      </div>
    </main>
  );
}
