import { hasPermission } from "@/lib/auth/permissions";
import { requirePageSession } from "@/lib/auth/server";

import { AdminDashboard } from "./_components/admin-dashboard";
import { EmployeeDashboard } from "./_components/employee-dashboard";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const session = await requirePageSession();
  const isForbidden = params.error === "forbidden";
  const isHrAdmin = hasPermission(session.roleKeys, "leave:policy:manage");

  return (
    <section className="space-y-5">
      {isForbidden ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          You do not have permission to access that module.
        </p>
      ) : null}

      {isHrAdmin ? <AdminDashboard session={session} /> : <EmployeeDashboard session={session} />}
    </section>
  );
}
