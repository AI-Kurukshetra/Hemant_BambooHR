import Link from "next/link";

import { canManageEmployees } from "@/lib/auth/employee-scope";
import { requirePagePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

import { createEmployeeAction } from "./actions";

export const dynamic = "force-dynamic";

type EmployeesPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  missing_required_fields: "Please fill all required employee fields.",
  invalid_hire_date: "Hire date is invalid.",
  employee_create_failed: "Could not create employee. Check unique fields and try again.",
  employee_not_found: "Employee record not found.",
  employee_load_failed: "Could not load employees right now. Please refresh.",
};

const successMessages: Record<string, string> = {
  employee_created: "Employee was created successfully.",
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = await searchParams;
  const session = await requirePagePermission("employee:read");
  const canManage = canManageEmployees(session.roleKeys);

  let employees: Array<{
    id: string;
    employeeNumber: string;
    userId: string | null;
    profile: { firstName: string; lastName: string; workEmail: string | null } | null;
    jobs: Array<{ title: string; department: string; status: string }>;
  }> = [];
  let managerOptions: Array<{
    id: string;
    employeeNumber: string;
    profile: { firstName: string; lastName: string } | null;
  }> = [];
  let loadError = "";

  try {
    employees = await prisma.employee.findMany({
      where: {
        companyId: session.appUser!.companyId,
        ...(canManage ? {} : { userId: session.authUser.id }),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        employeeNumber: true,
        userId: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            workEmail: true,
          },
        },
        jobs: {
          where: {
            isCurrent: true,
          },
          take: 1,
          select: {
            title: true,
            department: true,
            status: true,
          },
        },
      },
    });

    managerOptions = canManage
      ? await prisma.employee.findMany({
          where: {
            companyId: session.appUser!.companyId,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            employeeNumber: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        })
      : [];
  } catch {
    loadError = errorMessages.employee_load_failed;
  }

  const errorMessage = params.error ? errorMessages[params.error] : "";
  const successMessage = params.message ? successMessages[params.message] : "";

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Employee Core</h2>
        <p className="mt-2 text-sm text-slate-600">
          List, create, and open employee profiles. Role scope is enforced server-side.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      ) : null}
      {loadError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}

      {canManage ? (
        <form action={createEmployeeAction} className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Create Employee</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Employee Number*
              <input
                name="employeeNumber"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Work Email
              <input name="workEmail" type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-700">
              First Name*
              <input name="firstName" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
            </label>
            <label className="text-sm text-slate-700">
              Last Name*
              <input name="lastName" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
            </label>
            <label className="text-sm text-slate-700">
              Hire Date*
              <input name="hireDate" type="date" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
            </label>
            <label className="text-sm text-slate-700">
              Employment Type*
              <input
                name="employmentType"
                placeholder="full_time"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Title*
              <input name="title" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
            </label>
            <label className="text-sm text-slate-700">
              Department*
              <input name="department" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
            </label>
            <label className="text-sm text-slate-700">
              Status
              <select name="status" defaultValue="active" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="on_notice">on_notice</option>
                <option value="terminated">terminated</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Manager
              <select name="managerEmployeeId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                <option value="">None</option>
                {managerOptions.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.employeeNumber} - {manager.profile?.firstName} {manager.profile?.lastName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Create employee
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Current Job</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => {
              const currentJob = employee.jobs[0];
              return (
                <tr key={employee.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-800">
                    <p className="font-medium">
                      {employee.employeeNumber} - {employee.profile?.firstName} {employee.profile?.lastName}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{employee.profile?.workEmail || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {currentJob ? `${currentJob.title} (${currentJob.department})` : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{currentJob?.status || "-"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/employees/${employee.id}`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                    >
                      Open profile
                    </Link>
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  No employees available in your scope.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
