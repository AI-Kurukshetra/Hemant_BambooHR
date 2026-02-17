import Link from "next/link";

import type { AppSession } from "@/lib/auth/server";
import { getEmployeeDashboardData } from "@/lib/dashboard/queries";

function toYmd(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function EmployeeDashboard({ session }: { session: AppSession }) {
  const data = await getEmployeeDashboardData(session);

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-slate-900">Welcome, {data.displayName}</h2>
        <p className="mt-2 text-sm text-slate-600">
          {data.title} | {data.department}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Manager: {data.managerName}
          {data.managerEmployeeNumber ? ` (${data.managerEmployeeNumber})` : ""}
        </p>
      </div>

      {data.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {data.warnings.join(" ")}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Leave Balance</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.leaveBalances.map((balance) => {
            const baseline = Math.max(balance.opening, 1);
            const usedPercent = Math.max(0, Math.min(100, (balance.used / baseline) * 100));
            const pendingPercent = Math.max(0, Math.min(100, (balance.pending / baseline) * 100));
            return (
              <article key={balance.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium text-slate-900">
                  {balance.name} ({balance.code})
                </p>
                <p className="mt-1 text-sm text-slate-600">Accrued: {balance.opening}</p>
                <p className="text-sm text-slate-600">Used: {balance.used}</p>
                <p className="text-sm text-slate-600">Pending: {balance.pending}</p>
                <p className="text-sm font-medium text-slate-900">Remaining: {balance.available}</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: `${100 - usedPercent}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Pending load: {pendingPercent.toFixed(0)}%</p>
              </article>
            );
          })}
          {data.leaveBalances.length === 0 ? (
            <p className="text-sm text-slate-500">No leave balances available yet.</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/leaves" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Request Leave
        </Link>
        <Link
          href={data.employeeId ? `/dashboard/employees/${data.employeeId}` : "/dashboard/employees"}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Update Profile
        </Link>
        <Link
          href={data.employeeId ? `/dashboard/employees/${data.employeeId}` : "/dashboard/employees"}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Upload Document
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Recent Leave Activity</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {data.recentRequests.map((request) => (
              <li key={request.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">
                  {request.leaveTypeName} | {request.status.toUpperCase()}
                </p>
                <p>
                  {toYmd(request.startDate)} to {toYmd(request.endDate)} ({request.quantity} day(s))
                </p>
              </li>
            ))}
            {data.recentRequests.length === 0 ? (
              <li className="text-slate-500">No leave requests yet.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Profile Tasks</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {data.profileTasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
            {data.profileTasks.length === 0 ? (
              <li className="list-none text-slate-500">Profile is complete.</li>
            ) : null}
          </ul>
        </div>
      </div>

      {data.pendingApprovals.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Pending Approvals (Direct Reports)</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {data.pendingApprovals.map((item) => (
              <li key={item.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">
                  {item.employeeNumber} - {item.employeeName}
                </p>
                <p>
                  {item.leaveTypeName} | {toYmd(item.startDate)} to {toYmd(item.endDate)} ({item.quantity} day(s))
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/leaves"
            className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Open Leave Approvals
          </Link>
        </div>
      ) : null}
    </section>
  );
}
