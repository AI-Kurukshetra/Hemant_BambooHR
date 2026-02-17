import Link from "next/link";

import { login } from "@/app/actions/auth";
import { APP_ROLES } from "@/lib/auth/permissions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  missing_credentials: "Email and password are required.",
};
const roleLabels: Record<(typeof APP_ROLES)[number], string> = {
  super_admin: "Super Admin",
  hr_admin: "HR Admin",
  payroll_manager: "Payroll Manager",
  manager: "Manager",
  employee: "Employee",
  auditor: "Auditor",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next || "/dashboard";
  const errorMessage = params.error ? errorMessages[params.error] : "";
  const infoMessage =
    params.message === "signup_success"
      ? "Account created. If email confirmation is enabled, verify your email before signing in."
      : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Sign in</h1>
      <p className="mb-6 text-sm text-zinc-600">
        Use your Supabase Auth account to access the PMO-FC dashboard.
      </p>

      {errorMessage ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {infoMessage ? (
        <p className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {infoMessage}
        </p>
      ) : null}

      <form action={login} className="space-y-3 rounded-lg border border-zinc-200 p-5">
        <input type="hidden" name="next" value={nextPath} />
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
          autoComplete="current-password"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          required
        />
        <label className="block text-sm font-medium text-zinc-700" htmlFor="testRole">
          Test role (applied on sign in)
        </label>
        <select
          id="testRole"
          name="testRole"
          defaultValue="employee"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        >
          {APP_ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabels[role]}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          This is a testing helper. Selected role will become this user&apos;s active app role.
        </p>
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Continue
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/signup" className="text-zinc-600 underline">
          Create account
        </Link>
        <Link href="/" className="text-zinc-600 underline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
