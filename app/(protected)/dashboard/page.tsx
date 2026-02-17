import Link from "next/link";

export const dynamic = "force-dynamic";

const MODULE_CARDS = [
  {
    title: "Employee Core",
    description: "Profiles, job info, and documents.",
    href: "/dashboard/employees",
  },
  {
    title: "Leaves",
    description: "Leave requests, balances, and approvals.",
    href: "/dashboard/leaves",
  },
  {
    title: "Payroll",
    description: "Payroll cycles, runs, and payslips.",
    href: "/dashboard/payroll",
  },
];

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const isForbidden = params.error === "forbidden";
  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-600">
            Milestone 0 shell is active. Module pages are scaffolded with role guards.
          </p>
        </div>
      </div>

      {isForbidden ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          You do not have permission to access that module.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {MODULE_CARDS.map((card) => (
          <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
            <Link
              href={card.href}
              className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Open
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
