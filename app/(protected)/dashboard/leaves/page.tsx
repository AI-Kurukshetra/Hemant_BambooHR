import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

import {
  assignLeavePolicyAction,
  createLeavePolicyAction,
  createLeaveRequestAction,
  createLeaveTypeAction,
  deleteLeavePolicyAction,
  deleteLeaveTypeAction,
  decideLeaveRequestAction,
  updateLeavePolicyAction,
  updateLeaveTypeAction,
} from "./actions";

export const dynamic = "force-dynamic";

async function queryWithRetry<T>(query: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await query();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

type LeavesPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  leave_type_required: "Leave type code and name are required.",
  leave_type_create_failed: "Could not create leave type.",
  leave_type_update_failed: "Could not update leave type.",
  leave_type_delete_failed: "Could not delete leave type.",
  leave_type_in_use: "Leave type cannot be deleted because it is associated with policy/employee usage.",
  leave_policy_required: "Leave policy fields are required.",
  leave_policy_create_failed: "Could not create leave policy.",
  leave_policy_update_failed: "Could not update leave policy.",
  leave_policy_delete_failed: "Could not delete leave policy.",
  leave_policy_in_use: "Leave policy cannot be deleted because it is associated with leave type or employee assignment.",
  leave_assignment_required: "Employee, policy, and effective date are required.",
  leave_assignment_failed: "Could not assign leave policy.",
  leave_request_required: "Leave type and date range are required.",
  leave_request_date_invalid: "Leave request dates are invalid.",
  leave_request_cross_year: "Cross-year leave requests are not supported in one entry. Please split by year.",
  leave_request_overlap: "You already have a pending/approved leave request in this date range.",
  leave_request_insufficient_balance: "Insufficient leave balance for this request.",
  leave_request_create_failed: "Could not create leave request.",
  leave_decision_required: "Approval decision data is missing.",
  leave_decision_invalid: "This leave request cannot be decided.",
  leave_decision_failed: "Could not update leave request decision.",
  employee_mapping_missing: "Your account is not mapped to an employee record.",
};

const successMessages: Record<string, string> = {
  leave_type_created: "Leave type created.",
  leave_type_updated: "Leave type updated.",
  leave_type_deleted: "Leave type deleted.",
  leave_policy_created: "Leave policy created.",
  leave_policy_updated: "Leave policy updated.",
  leave_policy_deleted: "Leave policy deleted.",
  leave_policy_assigned: "Leave policy assigned to employee.",
  leave_requested: "Leave request submitted.",
  leave_decided: "Leave request decision saved.",
};

export default async function LeavesPage({ searchParams }: LeavesPageProps) {
  const params = await searchParams;
  const session = await requirePagePermission("leave:request:read:self");
  const canManagePolicy = hasPermission(session.roleKeys, "leave:policy:manage");
  const canApproveByRole = hasPermission(session.roleKeys, "leave:request:approve");
  const canReadTeamByRole = hasPermission(session.roleKeys, "leave:request:read:team");

  const companyId = session.appUser!.companyId;
  const currentYear = new Date().getUTCFullYear();

  let leaveTypes: Array<{
    id: string;
    code: string;
    name: string;
    requiresApproval: boolean;
    allowNegative: boolean;
  }> = [];
  let leavePolicies: Array<{
    id: string;
    name: string;
    accrualFrequency: string;
    carryForwardLimit: unknown;
    entitlements: Array<{ leaveType: { code: string; name: string }; annualAllocation: unknown }>;
  }> = [];
  let leavePolicyOptions: Array<{
    id: string;
    name: string;
  }> = [];
  let employees: Array<{
    id: string;
    employeeNumber: string;
  }> = [];
  let myEmployee: { id: string } | null = null;
  let isDynamicManager = false;
  let recentNotifications: Array<{
    id: string;
    action: string;
    createdAt: Date;
    payload: unknown;
  }> = [];
  const [leaveTypesResult, leavePoliciesResult, leavePoliciesBasicResult, employeesResult, myEmployeeResult, notificationsResult] =
    await Promise.allSettled([
      queryWithRetry(() =>
        prisma.leaveType.findMany({
          where: { companyId, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, code: true, name: true, requiresApproval: true, allowNegative: true },
        }),
      ),
      queryWithRetry(() =>
        prisma.leavePolicy.findMany({
          where: { companyId, isActive: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            accrualFrequency: true,
            carryForwardLimit: true,
            entitlements: {
              select: {
                leaveType: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                annualAllocation: true,
              },
            },
          },
        }),
      ),
      queryWithRetry(() =>
        prisma.leavePolicy.findMany({
          where: { companyId, isActive: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            accrualFrequency: true,
            carryForwardLimit: true,
          },
        }),
      ),
      canManagePolicy
        ? queryWithRetry(() =>
            prisma.employee.findMany({
              where: {
                companyId,
              },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                employeeNumber: true,
              },
            }),
          )
        : Promise.resolve([]),
      queryWithRetry(() =>
        prisma.employee.findFirst({
          where: {
            companyId,
            userId: session.authUser.id,
          },
          select: {
            id: true,
          },
        }),
      ),
      queryWithRetry(() =>
        prisma.auditLog.findMany({
          where: {
            companyId,
            entityType: "leave_request",
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            action: true,
            createdAt: true,
            payload: true,
          },
        }),
      ),
    ]);

  const loadIssues: string[] = [];
  if (leaveTypesResult.status === "fulfilled") {
    leaveTypes = leaveTypesResult.value;
  } else {
    loadIssues.push("leave types");
  }

  if (leavePoliciesBasicResult.status === "fulfilled") {
    leavePolicyOptions = leavePoliciesBasicResult.value.map((policy) => ({
      id: policy.id,
      name: policy.name,
    }));
  }

  if (leavePoliciesResult.status === "fulfilled") {
    leavePolicies = leavePoliciesResult.value;
    if (leavePolicyOptions.length === 0) {
      leavePolicyOptions = leavePoliciesResult.value.map((policy) => ({
        id: policy.id,
        name: policy.name,
      }));
    }
  } else if (leavePoliciesBasicResult.status === "fulfilled") {
    leavePolicies = leavePoliciesBasicResult.value.map((policy) => ({
      ...policy,
      entitlements: [],
    }));
    loadIssues.push("leave policy details");
  } else {
    loadIssues.push("leave policies");
  }
  if (employeesResult.status === "fulfilled") {
    employees = employeesResult.value;
  } else {
    loadIssues.push("employees");
  }
  if (myEmployeeResult.status === "fulfilled") {
    myEmployee = myEmployeeResult.value;
  }
  if (notificationsResult.status === "fulfilled") {
    recentNotifications = notificationsResult.value;
  }

  if (myEmployee && !canManagePolicy) {
    try {
      const directReportCount = await prisma.employeeJob.count({
        where: {
          isCurrent: true,
          managerEmployeeId: myEmployee.id,
        },
      });
      isDynamicManager = directReportCount > 0;
    } catch {
      loadIssues.push("manager scope");
    }
  }

  const canApprove = canManagePolicy || canApproveByRole || isDynamicManager;
  const canReadTeam = canManagePolicy || canReadTeamByRole || isDynamicManager;

  let myRequests: Array<{
    id: string;
    startDate: Date;
    endDate: Date;
    quantity: unknown;
    status: string;
    reason: string | null;
    leaveType: { name: string };
  }> = [];
  let myBalances: Array<{
    id: string;
    leaveType: { name: string; code: string };
    openingBalance: unknown;
    usedAmount: unknown;
    pendingAmount: unknown;
    availableAmount: unknown;
  }> = [];

  if (myEmployee) {
    try {
      [myRequests, myBalances] = await Promise.all([
        prisma.leaveRequest.findMany({
          where: {
            employeeId: myEmployee.id,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            startDate: true,
            endDate: true,
            quantity: true,
            status: true,
            reason: true,
            leaveType: {
              select: {
                name: true,
              },
            },
          },
        }),
        prisma.employeeLeaveBalance.findMany({
          where: {
            employeeId: myEmployee.id,
            balanceYear: currentYear,
          },
          orderBy: {
            leaveType: {
              name: "asc",
            },
          },
          select: {
            id: true,
            leaveType: { select: { name: true, code: true } },
            openingBalance: true,
            usedAmount: true,
            pendingAmount: true,
            availableAmount: true,
          },
        }),
      ]);
    } catch {
      loadIssues.push("my requests/balances");
    }
  }

  let pendingApprovals: Array<{
    id: string;
    startDate: Date;
    endDate: Date;
    quantity: unknown;
    reason: string | null;
    employee: {
      employeeNumber: string;
      profile: { firstName: string; lastName: string } | null;
    };
    leaveType: { name: string };
  }> = [];

  if (canApprove && canReadTeam) {
    try {
      if (canManagePolicy) {
        pendingApprovals = await prisma.leaveRequest.findMany({
          where: {
            status: "pending",
            employee: {
              companyId,
            },
          },
          orderBy: { createdAt: "asc" },
          take: 30,
          select: {
            id: true,
            startDate: true,
            endDate: true,
            quantity: true,
            reason: true,
            employee: {
              select: {
                employeeNumber: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            leaveType: {
              select: {
                name: true,
              },
            },
          },
        });
      } else if (myEmployee) {
        const directReportRows = await prisma.employeeJob.findMany({
          where: {
            isCurrent: true,
            managerEmployeeId: myEmployee.id,
          },
          select: {
            employeeId: true,
          },
        });
        const directReportIds = [...new Set(directReportRows.map((row) => row.employeeId))];

        if (directReportIds.length > 0) {
          pendingApprovals = await prisma.leaveRequest.findMany({
            where: {
              status: "pending",
              employeeId: {
                in: directReportIds,
              },
            },
            orderBy: { createdAt: "asc" },
            take: 30,
            select: {
              id: true,
              startDate: true,
              endDate: true,
              quantity: true,
              reason: true,
              employee: {
                select: {
                  employeeNumber: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              leaveType: {
                select: {
                  name: true,
                },
              },
            },
          });
        }
      }
    } catch {
      loadIssues.push("pending approvals");
    }
  }

  const errorMessage = params.error ? errorMessages[params.error] : "";
  const successMessage = params.message ? successMessages[params.message] : "";

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Leave Management</h2>
        <p className="mt-2 text-sm text-slate-600">
          Leave policy setup, employee requests, manager approvals, balances, and event notifications.
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
      {loadIssues.length > 0 ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Could not load: {loadIssues.join(", ")}. Other leave sections are still available.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">My Leave Request</h3>
          {myEmployee ? (
            <form action={createLeaveRequestAction} className="mt-3 space-y-3">
              <label className="block text-sm text-slate-700">
                Leave Type*
                <select name="leaveTypeId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required>
                  <option value="">Select</option>
                  {leaveTypes.map((leaveType) => (
                    <option key={leaveType.id} value={leaveType.id}>
                      {leaveType.name} ({leaveType.code})
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm text-slate-700">
                  Start Date*
                  <input type="date" name="startDate" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
                </label>
                <label className="block text-sm text-slate-700">
                  End Date*
                  <input type="date" name="endDate" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
                </label>
              </div>
              <label className="block text-sm text-slate-700">
                Reason
                <textarea
                  name="reason"
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Optional reason"
                />
              </label>
              <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                Submit Request
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No employee profile mapped to your account yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">My Leave Balances ({currentYear})</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {myBalances.map((balance) => (
              <li key={balance.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">
                  {balance.leaveType.name} ({balance.leaveType.code})
                </p>
                <p>Opening: {String(balance.openingBalance)}</p>
                <p>Used: {String(balance.usedAmount)}</p>
                <p>Pending: {String(balance.pendingAmount)}</p>
                <p>Available: {String(balance.availableAmount)}</p>
              </li>
            ))}
            {myBalances.length === 0 ? <li className="text-slate-500">No balances available yet.</li> : null}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">My Leave History</h3>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((request) => (
                <tr key={request.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{request.leaveType.name}</td>
                  <td className="px-3 py-2">
                    {request.startDate.toISOString().slice(0, 10)} to {request.endDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-3 py-2">{String(request.quantity)}</td>
                  <td className="px-3 py-2">{request.status}</td>
                  <td className="px-3 py-2">{request.reason || "-"}</td>
                </tr>
              ))}
              {myRequests.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-center text-slate-500" colSpan={5}>
                    No leave requests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {canApprove ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Pending Approvals</h3>
          <ul className="mt-3 space-y-3">
            {pendingApprovals.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">
                  {item.employee.employeeNumber} - {item.employee.profile?.firstName} {item.employee.profile?.lastName}
                </p>
                <p>Type: {item.leaveType.name}</p>
                <p>
                  Period: {item.startDate.toISOString().slice(0, 10)} to {item.endDate.toISOString().slice(0, 10)}
                </p>
                <p>Quantity: {String(item.quantity)}</p>
                <p>Reason: {item.reason || "-"}</p>
                <form action={decideLeaveRequestAction} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="leaveRequestId" value={item.id} />
                  <input
                    type="text"
                    name="comments"
                    placeholder="Optional comments"
                    className="rounded-md border border-slate-300 px-3 py-1.5"
                  />
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    className="rounded-md bg-rose-700 px-3 py-1.5 text-white"
                  >
                    Reject
                  </button>
                </form>
              </li>
            ))}
            {pendingApprovals.length === 0 ? (
              <li className="text-sm text-slate-500">No pending approvals.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {canManagePolicy ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <form action={createLeaveTypeAction} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Create Leave Type</h3>
            <div className="mt-3 space-y-3 text-sm">
              <label className="block">
                Code*
                <input name="code" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
              </label>
              <label className="block">
                Name*
                <input name="name" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="requiresApproval" defaultChecked />
                Requires Approval
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="allowNegative" />
                Allow Negative Balance
              </label>
              <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-white">
                Save Type
              </button>
            </div>
          </form>

          <form action={createLeavePolicyAction} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Create Leave Policy</h3>
            <div className="mt-3 space-y-3 text-sm">
              <label className="block">
                Policy Name*
                <input name="name" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
              </label>
              <label className="block">
                Accrual Frequency
                <select name="accrualFrequency" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
                  <option value="yearly">yearly</option>
                  <option value="monthly">monthly</option>
                </select>
              </label>
              <label className="block">
                Leave Type*
                <select name="leaveTypeId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required>
                  <option value="">Select</option>
                  {leaveTypes.map((leaveType) => (
                    <option key={leaveType.id} value={leaveType.id}>
                      {leaveType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Annual Allocation*
                <input
                  name="annualAllocation"
                  type="number"
                  step="0.5"
                  min="0"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              <label className="block">
                Carry Forward Limit
                <input
                  name="carryForwardLimit"
                  type="number"
                  step="0.5"
                  min="0"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </label>
              <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-white">
                Save Policy
              </button>
            </div>
          </form>

          <form action={assignLeavePolicyAction} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Assign Policy to Employee</h3>
            <div className="mt-3 space-y-3 text-sm">
              <label className="block">
                Employee*
                <select name="employeeId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required>
                  <option value="">Select</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.employeeNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Leave Policy*
                <select name="leavePolicyId" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required>
                  <option value="">Select</option>
                  {leavePolicyOptions.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Effective From*
                <input
                  type="date"
                  name="effectiveFrom"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </label>
              <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-white">
                Assign
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {canManagePolicy ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Manage Leave Types</h3>
            <div className="mt-3 space-y-3">
              {leaveTypes.map((leaveType) => (
                <form
                  key={leaveType.id}
                  action={updateLeaveTypeAction}
                  className="rounded-md border border-slate-200 p-3 text-sm"
                >
                  <input type="hidden" name="leaveTypeId" value={leaveType.id} />
                  <p className="mb-2 font-medium text-slate-900">
                    {leaveType.code}
                  </p>
                  <label className="block">
                    Name
                    <input
                      name="name"
                      defaultValue={leaveType.name}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="requiresApproval" defaultChecked={leaveType.requiresApproval} />
                      Requires Approval
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="allowNegative" defaultChecked={leaveType.allowNegative} />
                      Allow Negative
                    </label>
                  </div>
                  <button type="submit" className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-white">
                    Update Type
                  </button>
                  <button
                    type="submit"
                    formAction={deleteLeaveTypeAction}
                    className="mt-2 ml-2 rounded-md border border-rose-300 px-3 py-1.5 text-rose-700 hover:bg-rose-50"
                  >
                    Delete Type
                  </button>
                </form>
              ))}
              {leaveTypes.length === 0 ? (
                <p className="text-sm text-slate-500">No leave types available yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Manage Leave Policies</h3>
            <div className="mt-3 space-y-3">
              {leavePolicies.map((policy) => {
                const entitlement = policy.entitlements[0];
                return (
                  <form
                    key={policy.id}
                    action={updateLeavePolicyAction}
                    className="rounded-md border border-slate-200 p-3 text-sm"
                  >
                    <input type="hidden" name="leavePolicyId" value={policy.id} />
                    <label className="block">
                      Policy Name
                      <input
                        name="name"
                        defaultValue={policy.name}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="mt-2 block">
                      Accrual Frequency
                      <select
                        name="accrualFrequency"
                        defaultValue={policy.accrualFrequency}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      >
                        <option value="yearly">yearly</option>
                        <option value="monthly">monthly</option>
                      </select>
                    </label>
                    <label className="mt-2 block">
                      Annual Allocation
                      <input
                        name="annualAllocation"
                        defaultValue={String(entitlement?.annualAllocation ?? 0)}
                        type="number"
                        step="0.5"
                        min="0"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <label className="mt-2 block">
                      Carry Forward Limit
                      <input
                        name="carryForwardLimit"
                        defaultValue={policy.carryForwardLimit ? String(policy.carryForwardLimit) : ""}
                        type="number"
                        step="0.5"
                        min="0"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                      />
                    </label>
                    <p className="mt-2 text-xs text-slate-500">
                      Leave Type: {entitlement?.leaveType.name || "N/A"}
                    </p>
                    <button type="submit" className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-white">
                      Update Policy
                    </button>
                    <button
                      type="submit"
                      formAction={deleteLeavePolicyAction}
                      className="mt-2 ml-2 rounded-md border border-rose-300 px-3 py-1.5 text-rose-700 hover:bg-rose-50"
                    >
                      Delete Policy
                    </button>
                  </form>
                );
              })}
              {leavePolicies.length === 0 ? (
                <p className="text-sm text-slate-500">No leave policies available yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Leave Notifications</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {recentNotifications.map((event) => (
            <li key={event.id} className="rounded-md border border-slate-200 p-3">
              <p className="font-medium text-slate-900">{event.action}</p>
              <p className="text-slate-600">{event.createdAt.toISOString().replace("T", " ").slice(0, 16)}</p>
            </li>
          ))}
          {recentNotifications.length === 0 ? (
            <li className="text-slate-500">No leave notifications yet.</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
