import { requirePagePermission } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function LeavesPage() {
  await requirePagePermission("leave:request:read:self");

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-slate-900">Leaves</h2>
      <p className="mt-2 text-sm text-slate-600">
        Leave module shell is ready. Next milestone will add request, balance, and approval flows.
      </p>
    </section>
  );
}

