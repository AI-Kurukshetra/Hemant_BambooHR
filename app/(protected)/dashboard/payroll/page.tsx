import { requirePagePermission } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  await requirePagePermission("payroll:run:read");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-slate-900">Payroll</h2>
      <p className="mt-2 text-sm text-slate-600">
        Payroll module shell is ready. Next milestone will add cycle setup, payroll run, and payslip
        views.
      </p>
    </section>
  );
}

