import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-6 px-6">
      <p className="text-sm uppercase tracking-wide text-zinc-500">BambooHR Clone</p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
        HR Platform Foundation
      </h1>
      <p className="max-w-2xl text-zinc-600">
        Next.js + Supabase foundation with auth, RBAC scaffolding, protected dashboard modules,
        and API session guards.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Open dashboard
        </Link>
      </div>
    </div>
  );
}
