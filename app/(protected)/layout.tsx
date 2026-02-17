import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { hasPermission } from "@/lib/auth/permissions";
import { getAppSession } from "@/lib/auth/server";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/employees", label: "Employees", permission: "employee:read" as const },
  { href: "/dashboard/leaves", label: "Leaves", permission: "leave:request:read:self" as const },
  { href: "/dashboard/payroll", label: "Payroll", permission: "payroll:run:read" as const },
  { href: "/dashboard/audits", label: "Audit Logs", permission: "audit:read" as const },
];

const ROLE_LABELS: Record<string, string> = {
  hr_admin: "HR Admin",
  employee: "Employee",
};

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getAppSession();

  if (!session) {
    redirect("/login");
  }

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) {
      return true;
    }
    return hasPermission(session.roleKeys, item.permission);
  });
  const activeRole = session.roleKeys[0];
  const roleLabel = activeRole ? ROLE_LABELS[activeRole] || activeRole : "Unassigned";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">BambooHR Clone</p>
            <h1 className="text-lg font-semibold text-slate-900">HR Platform</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-600">{session.authUser.email}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {roleLabel}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <nav className="space-y-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
