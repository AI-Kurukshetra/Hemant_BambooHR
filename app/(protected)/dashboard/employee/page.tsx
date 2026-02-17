import { requirePageSession } from "@/lib/auth/server";

import { EmployeeDashboard } from "../_components/employee-dashboard";

export const dynamic = "force-dynamic";

export default async function EmployeeDashboardPage() {
  const session = await requirePageSession();
  return <EmployeeDashboard session={session} />;
}
