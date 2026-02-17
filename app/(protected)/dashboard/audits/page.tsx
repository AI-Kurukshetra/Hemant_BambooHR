import { hasPermission } from "@/lib/auth/permissions";
import { requirePageSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const session = await requirePageSession();
  if (!session.appUser || !hasPermission(session.roleKeys, "audit:read")) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Audit Logs</h2>
        <p className="mt-2 text-sm text-slate-600">You do not have access to audit logs.</p>
      </section>
    );
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      companyId: session.appUser.companyId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
  });

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">System Audit Logs</h2>
        <p className="mt-2 text-sm text-slate-600">Latest 50 audit events for this company.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Entity ID</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-200">
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.entityType}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.entityId || "-"}</td>
                <td className="px-4 py-3">{log.createdAt.toISOString().replace("T", " ").slice(0, 16)}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                  No audit events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
