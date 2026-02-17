import Link from "next/link";

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-slate-900" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-slate-900" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      <path d="m9 15 2 2 4-4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-slate-900" aria-hidden="true">
      <path d="M12 3 4 7v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10V7l-8-4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="text-lg font-semibold tracking-tight">CompanyHR</div>
          <Link
            href="/login"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-700"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-6 py-24 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">HR & Payroll Platform</p>
          <h1 className="mx-auto mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Manage your work life, beautifully.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-slate-600 sm:text-lg">
            One secure platform for employee profiles, time off workflows, and payroll operations.
            Built for speed, clarity, and confident HR execution.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="rounded-md bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-700"
            >
              Sign In to Portal
            </Link>
            <Link
              href="/helpdesk"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Help & Support
            </Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <UsersIcon />
              <h2 className="mt-4 text-lg font-semibold">Employee Hub</h2>
              <p className="mt-2 text-sm text-slate-600">
                Manage profiles, job info, and secure employee documents in one place.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <CalendarIcon />
              <h2 className="mt-4 text-lg font-semibold">Leave Management</h2>
              <p className="mt-2 text-sm text-slate-600">
                Handle time off requests, approvals, and live leave balances with clear policy controls.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <ShieldIcon />
              <h2 className="mt-4 text-lg font-semibold">Payroll & Payslips</h2>
              <p className="mt-2 text-sm text-slate-600">
                Deliver accurate payroll runs and secure financial records with confidence.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-slate-600 sm:flex-row">
          <p>© {year} CompanyHR. All rights reserved.</p>
          <Link href="/helpdesk" className="underline underline-offset-2 hover:text-slate-900">
            IT Helpdesk
          </Link>
        </div>
      </footer>
    </div>
  );
}
