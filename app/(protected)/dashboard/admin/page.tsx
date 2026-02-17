import { redirect } from "next/navigation";

import { hasPermission } from "@/lib/auth/permissions";
import { requirePageSession } from "@/lib/auth/server";

import { AdminDashboard } from "../_components/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requirePageSession();
  if (!hasPermission(session.roleKeys, "leave:policy:manage")) {
    redirect("/dashboard?error=forbidden");
  }

  return <AdminDashboard session={session} />;
}
