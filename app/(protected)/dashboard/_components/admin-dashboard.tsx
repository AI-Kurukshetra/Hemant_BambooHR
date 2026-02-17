import Link from "next/link";

import type { AppSession } from "@/lib/auth/server";
import { getAdminDashboardData } from "@/lib/dashboard/queries";

function toYmd(value: Date) {
  return value.toISOString().slice(0, 10);
}

const ALERT_COLORS = {
  profile: "text-amber-700",
  document: "text-rose-700",
  job: "text-blue-700",
} as const;

export async function AdminDashboard({ session }: { session: AppSession }) {
  const data = await getAdminDashboardData(session);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-900">HR Admin Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">
          Company-level monitoring for employee records, leave operations, and compliance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Headcount</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data.headcount.total}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{data.headcount.active}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Inactive</p>
          <p className="mt-2 text-2xl font-semibold text-slate-700">{data.headcount.inactive}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">New Hires (30d)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{data.headcount.newHires30d}</p>
        </article>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Global Leave Command Center</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {data.pendingLeaveRequests.map((request) => (
            <li key={request.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium text-slate-900">
                {request.employeeNumber} - {request.employeeName}
              </p>
              <p>
                {request.leaveTypeName} | {toYmd(request.startDate)} to {toYmd(request.endDate)} ({request.quantity} day(s))
              </p>
              <p className="text-xs text-slate-500">Requested on {toYmd(request.createdAt)}</p>
            </li>
          ))}
          {data.pendingLeaveRequests.length === 0 ? (
            <li className="text-slate-500">No pending leave requests.</li>
          ) : null}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Compliance & Document Alerts</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {data.complianceAlerts.map((alert) => (
            <li key={alert.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium text-slate-900">
                {alert.employeeNumber} - {alert.employeeName}
              </p>
              <p className={ALERT_COLORS[alert.alertType]}>{alert.message}</p>
            </li>
          ))}
          {data.complianceAlerts.length === 0 ? (
            <li className="text-slate-500">No compliance alerts right now.</li>
          ) : null}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/employees" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Add New Employee
        </Link>
        <Link
          href="/dashboard/leaves"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Manage Leave Policies
        </Link>
        <Link
          href="/dashboard/audits"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          System Audit Logs
        </Link>
      </div>
    </section>
  );
}
