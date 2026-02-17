"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LeaveApprovalDecision, type LeaveRequestStatus } from "@prisma/client";

import { hasPermission } from "@/lib/auth/permissions";
import { getAppSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  if (value && typeof value === "object" && "toString" in value) {
    return Number(String(value));
  }
  return 0;
}

function dayDiffInclusive(startDate: Date, endDate: Date) {
  const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

async function getCurrentEmployee(userId: string, companyId: string) {
  return prisma.employee.findFirst({
    where: {
      userId,
      companyId,
    },
    select: {
      id: true,
      userId: true,
    },
  });
}

async function recalculateLeaveBalance(employeeId: string, leaveTypeId: string, year: number) {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));

  const assignment = await prisma.leavePolicyAssignment.findFirst({
    where: {
      employeeId,
      effectiveFrom: {
        lte: yearEnd,
      },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: yearStart } }],
      leavePolicy: {
        isActive: true,
        entitlements: {
          some: {
            leaveTypeId,
          },
        },
      },
    },
    orderBy: {
      effectiveFrom: "desc",
    },
    select: {
      leavePolicy: {
        select: {
          entitlements: {
            where: {
              leaveTypeId,
            },
            select: {
              annualAllocation: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  const openingBalance = toNumber(assignment?.leavePolicy.entitlements[0]?.annualAllocation ?? 0);

  const [approved, pending] = await Promise.all([
    prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: "approved",
        startDate: {
          lte: yearEnd,
        },
        endDate: {
          gte: yearStart,
        },
      },
      _sum: {
        quantity: true,
      },
    }),
    prisma.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: "pending",
        startDate: {
          lte: yearEnd,
        },
        endDate: {
          gte: yearStart,
        },
      },
      _sum: {
        quantity: true,
      },
    }),
  ]);

  const usedAmount = toNumber(approved._sum.quantity ?? 0);
  const pendingAmount = toNumber(pending._sum.quantity ?? 0);
  const accruedAmount = 0;
  const adjustedAmount = 0;
  const availableAmount = openingBalance + accruedAmount + adjustedAmount - usedAmount - pendingAmount;

  await prisma.employeeLeaveBalance.upsert({
    where: {
      employeeId_leaveTypeId_balanceYear: {
        employeeId,
        leaveTypeId,
        balanceYear: year,
      },
    },
    update: {
      openingBalance,
      accruedAmount,
      usedAmount,
      pendingAmount,
      adjustedAmount,
      availableAmount,
    },
    create: {
      employeeId,
      leaveTypeId,
      balanceYear: year,
      openingBalance,
      accruedAmount,
      usedAmount,
      pendingAmount,
      adjustedAmount,
      availableAmount,
    },
  });
}

export async function createLeaveTypeAction(formData: FormData) {
  const session = await getAppSession();
  if (!session || !session.appUser) redirect("/login");
  if (!hasPermission(session.roleKeys, "leave:policy:manage")) redirect("/dashboard?error=forbidden");

  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  const requiresApproval = getString(formData, "requiresApproval") === "on";
  const allowNegative = getString(formData, "allowNegative") === "on";

  if (!code || !name) {
    redirect("/dashboard/leaves?error=leave_type_required");
  }

  try {
    await prisma.leaveType.create({
      data: {
        companyId: session.appUser.companyId,
        code,
        name,
        requiresApproval,
        allowNegative,
      },
    });
  } catch {
    redirect("/dashboard/leaves?error=leave_type_create_failed");
  }

  revalidatePath("/dashboard/leaves");
  redirect("/dashboard/leaves?message=leave_type_created");
}

export async function updateLeaveTypeAction(formData: FormData) {
  const session = await getAppSession();
  if (!session || !session.appUser) redirect("/login");
  if (!hasPermission(session.roleKeys, "leave:policy:manage")) redirect("/dashboard?error=forbidden");

  const leaveTypeId = getString(formData, "leaveTypeId");
  const name = getString(formData, "name");
  const requiresApproval = getString(formData, "requiresApproval") === "on";
  const allowNegative = getString(formData, "allowNegative") === "on";

  if (!leaveTypeId || !name) {
    redirect("/dashboard/leaves?error=leave_type_required");
  }

  try {
    await prisma.leaveType.update({
      where: { id: leaveTypeId },
      data: {
        name,
        requiresApproval,
        allowNegative,
      },
    });
  } catch {
    redirect("/dashboard/leaves?error=leave_type_update_failed");
  }

  revalidatePath("/dashboard/leaves");
  redirect("/dashboard/leaves?message=leave_type_updated");
}

export async function deleteLeaveTypeAction(formData: FormData) {
  const session = await getAppSession();
  if (!session || !session.appUser) redirect("/login");
  if (!hasPermission(session.roleKeys, "leave:policy:manage")) redirect("/dashboard?error=forbidden");

  const leaveTypeId = getString(formData, "leaveTypeId");
  if (!leaveTypeId) {
    redirect("/dashboard/leaves?error=leave_type_required");
  }

  const [policyLinks, balanceLinks, requestLinks] = await Promise.all([
    prisma.leavePolicyEntitlement.count({
      where: { leaveTypeId },
    }),
    prisma.employeeLeaveBalance.count({
      where: { leaveTypeId },
    }),
    prisma.leaveRequest.count({
      where: { leaveTypeId },
    }),
  ]);

  // Leave type can be deleted only when not associated with any employee usage or policy entitlement.
  if (policyLinks > 0 || balanceLinks > 0 || requestLinks > 0) {
    redirect("/dashboard/leaves?error=leave_type_in_use");
  }

  try {
    await prisma.leaveType.delete({
      where: { id: leaveTypeId },
    });
  } catch {
    redirect("/dashboard/leaves?error=leave_type_delete_failed");
  }

  revalidatePath("/dashboard/leaves");
  redirect("/dashboard/leaves?message=leave_type_deleted");
}

export async function createLeavePolicyAction(formData: FormData) {
  const session = await getAppSession();
  if (!session || !session.appUser) redirect("/login");
  if (!hasPermission(session.roleKeys, "leave:policy:manage")) redirect("/dashboard?error=forbidden");

  const name = getString(formData, "name");
  const accrualFrequency = getString(formData, "accrualFrequency") || "yearly";
  const leaveTypeId = getString(formData, "leaveTypeId");
  const annualAllocation = Number(getString(formData, "annualAllocation"));
  const carryForwardLimitRaw = getString(formData, "carryForwardLimit");
  const carryForwardLimit = carryForwardLimitRaw ? Number(carryForwardLimitRaw) : null;

  if (!name || !leaveTypeId || Number.isNaN(annualAllocation)) {
    redirect("/dashboard/leaves?error=leave_policy_required");
  }

  try {
    await prisma.leavePolicy.create({
      data: {
        companyId: session.appUser.companyId,
        name,
        accrualFrequency,
        carryForwardLimit,
        entitlements: {
          create: {
            leaveTypeId,
            annualAllocation,
          },
        },
      },
    });
  } catch {
    redirect("/dashboard/leaves?error=leave_policy_create_failed");
  }

  revalidatePath("/dashboard/leaves");
  redirect("/dashboard/leaves?message=leave_policy_created");
}

export async function updateLeavePolicyAction(formData: FormData) {
  const session = await getAppSession();
  if (!session || !session.appUser) redirect("/login");
  if (!hasPermission(session.roleKeys, "leave:policy:manage")) redirect("/dashboard?error=forbidden");

  const leavePolicyId = getString(formData, "leavePolicyId");
  const name = getString(formData, "name");
  const accrualFrequency = getString(formData, "accrualFrequency") || "yearly";
  const annualAllocation = Number(getString(formData, "annualAllocation"));
  const carryForwardLimitRaw = getString(formData, "carryForwardLimit");
  const carryForwardLimit = carryForwardLimitRaw ? Number(carryForwardLimitRaw) : null;

  if (!leavePolicyId || !name || Number.isNaN(annualAllocation)) {
    redirect("/dashboard/leaves?error=leave_policy_required");
  }

  try {
    const entitlement = await prisma.leavePolicyEntitlement.findFirst({
      where: { leavePolicyId },
      select: { id: true },
    });

    await prisma.leavePolicy.update({
      where: { id: leavePolicyId },
      data: {
        name,
        accrualFrequency,
        carryForwardLimit,
      },
    });

    if (entitlement) {
      await prisma.leavePolicyEntitlement.update({
        where: { id: entitlement.id },
        data: { annualAllocation },
      });
    }
  } catch {
    redirect("/dashboard/leaves?error=leave_policy_update_failed");
  }

  revalidatePath("/dashboard/leaves");
  redirect("/dashboard/leaves?message=leave_policy_updated");
}

export async function deleteLeavePolicyAction(formData: FormData) {
  const session = await getAppSession();
  if (!session || !session.appUser) redirect("/login");
  if (!hasPermission(session.roleKeys, "leave:policy:manage")) redirect("/dashboard?error=forbidden");

  const leavePolicyId = getString(formData, "leavePolicyId");
  if (!leavePolicyId) {
    redirect("/dashboard/leaves?error=leave_policy_required");
  }

  const [assignmentLinks, entitlementLinks] = await Promise.all([
    prisma.leavePolicyAssignment.count({
      where: { leavePolicyId },
    }),
    prisma.leavePolicyEntitlement.count({
      where: { leavePolicyId },
    }),
  ]);

  // Rule requested: policy can be deleted only when no leave types are associated.
  // Also block if already assigned to employees.
  if (entitlementLinks > 0 || assignmentLinks > 0) {
    redirect("/dashboard/leaves?error=leave_policy_in_use");
  }

  try {
    await prisma.leavePolicy.delete({
      where: { id: leavePolicyId },
    });
  } catch {
    redirect("/dashboard/leaves?error=leave_policy_delete_failed");
  }

  revalidatePath("/dashboard/leaves");
  redirect("/dashboard/leaves?message=leave_policy_deleted");
}

export async function assignLeavePolicyAction(formData: FormData) {
  const session = await getAppSession();
  if (!session || !session.appUser) redirect("/login");
  if (!hasPermission(session.roleKeys, "leave:policy:manage")) redirect("/dashboard?error=forbidden");

  const employeeId = getString(formData, "employeeId");
  const leavePolicyId = getString(formData, "leavePolicyId");
  const effectiveFromRaw = getString(formData, "effectiveFrom");

  const effectiveFrom = parseDate(effectiveFromRaw);
  if (!employeeId || !leavePolicyId || !effectiveFrom) {
    redirect("/dashboard/leaves?error=leave_assignment_required");
  }

  try {
    await prisma.leavePolicyAssignment.create({
      data: {
        employeeId,
        leavePolicyId,
        effectiveFrom,
      },
    });

    const entitlements = await prisma.leavePolicyEntitlement.findMany({
      where: {
        leavePolicyId,
      },
      select: {
        leaveTypeId: true,
      },
    });

    const year = effectiveFrom.getUTCFullYear();
    for (const entitlement of entitlements) {
      await recalculateLeaveBalance(employeeId, entitlement.leaveTypeId, year);
    }
  } catch {
    redirect("/dashboard/leaves?error=leave_assignment_failed");
  }

  revalidatePath("/dashboard/leaves");
  redirect("/dashboard/leaves?message=leave_policy_assigned");
}

export async function createLeaveRequestAction(formData: FormData) {
  const session = await getAppSession();
  if (!session || !session.appUser) redirect("/login");
  if (!hasPermission(session.roleKeys, "leave:request:create")) redirect("/dashboard?error=forbidden");

  const leaveTypeId = getString(formData, "leaveTypeId");
  const startDateRaw = getString(formData, "startDate");
  const endDateRaw = getString(formData, "endDate");
  const reason = getString(formData, "reason");

  const startDate = parseDate(startDateRaw);
  const endDate = parseDate(endDateRaw);
  if (!leaveTypeId || !startDate || !endDate) {
    redirect("/dashboard/leaves?error=leave_request_required");
  }
  if (endDate < startDate) {
    redirect("/dashboard/leaves?error=leave_request_date_invalid");
  }
  if (startDate.getUTCFullYear() !== endDate.getUTCFullYear()) {
    redirect("/dashboard/leaves?error=leave_request_cross_year");
  }

  const employee = await getCurrentEmployee(session.authUser.id, session.appUser.companyId);
  if (!employee) {
    redirect("/dashboard/leaves?error=employee_mapping_missing");
  }

  const quantity = dayDiffInclusive(startDate, endDate);
  if (quantity <= 0) {
    redirect("/dashboard/leaves?error=leave_request_date_invalid");
  }

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: {
        in: ["pending", "approved"],
      },
      startDate: {
        lte: endDate,
      },
      endDate: {
        gte: startDate,
      },
    },
    select: {
      id: true,
    },
  });
  if (overlap) {
    redirect("/dashboard/leaves?error=leave_request_overlap");
  }

  await recalculateLeaveBalance(employee.id, leaveTypeId, startDate.getUTCFullYear());
  const [leaveType, balance] = await Promise.all([
    prisma.leaveType.findFirst({
      where: {
        id: leaveTypeId,
        companyId: session.appUser.companyId,
      },
      select: {
        allowNegative: true,
      },
    }),
    prisma.employeeLeaveBalance.findFirst({
      where: {
        employeeId: employee.id,
        leaveTypeId,
        balanceYear: startDate.getUTCFullYear(),
      },
      select: {
        availableAmount: true,
      },
    }),
  ]);
  const availableAmount = toNumber(balance?.availableAmount ?? 0);
  if (!leaveType?.allowNegative && availableAmount < quantity) {
    redirect("/dashboard/leaves?error=leave_request_insufficient_balance");
  }

  try {
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId,
        requestedById: session.authUser.id,
        startDate,
        endDate,
        quantity,
        reason: reason || null,
      },
      select: {
        id: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.appUser.companyId,
        actorUserId: session.authUser.id,
        entityType: "leave_request",
        entityId: leaveRequest.id,
        action: "leave_request_created",
        payload: {
          employeeId: employee.id,
          leaveTypeId,
          quantity,
        },
      },
    });

    await recalculateLeaveBalance(employee.id, leaveTypeId, startDate.getUTCFullYear());
  } catch {
    redirect("/dashboard/leaves?error=leave_request_create_failed");
  }

  revalidatePath("/dashboard/leaves");
  redirect("/dashboard/leaves?message=leave_requested");
}

export async function decideLeaveRequestAction(formData: FormData) {
  const session = await getAppSession();
  if (!session || !session.appUser) redirect("/login");

  const leaveRequestId = getString(formData, "leaveRequestId");
  const decisionRaw = getString(formData, "decision");
  const comments = getString(formData, "comments");
  const decision = decisionRaw === "approved" ? LeaveApprovalDecision.approved : LeaveApprovalDecision.rejected;
  const status: LeaveRequestStatus = decision === LeaveApprovalDecision.approved ? "approved" : "rejected";

  if (!leaveRequestId) {
    redirect("/dashboard/leaves?error=leave_decision_required");
  }

  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: {
      id: leaveRequestId,
      employee: {
        companyId: session.appUser.companyId,
      },
    },
    select: {
      id: true,
      employeeId: true,
      leaveTypeId: true,
      status: true,
      employee: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!leaveRequest || leaveRequest.status !== "pending") {
    redirect("/dashboard/leaves?error=leave_decision_invalid");
  }

  const canApproveAll = hasPermission(session.roleKeys, "leave:policy:manage");
  if (!canApproveAll) {
    const managerEmployee = await getCurrentEmployee(session.authUser.id, session.appUser.companyId);
    if (!managerEmployee) {
      redirect("/dashboard?error=forbidden");
    }

    const isDirectReport = await prisma.employeeJob.findFirst({
      where: {
        employeeId: leaveRequest.employeeId,
        isCurrent: true,
        managerEmployeeId: managerEmployee.id,
      },
      select: {
        id: true,
      },
    });

    if (!isDirectReport) {
      redirect("/dashboard?error=forbidden");
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: {
          id: leaveRequest.id,
        },
        data: {
          status,
          decidedAt: new Date(),
        },
      });

      await tx.leaveApproval.create({
        data: {
          leaveRequestId: leaveRequest.id,
          approverId: session.authUser.id,
          decision,
          comments: comments || null,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: session.appUser!.companyId,
          actorUserId: session.authUser.id,
          entityType: "leave_request",
          entityId: leaveRequest.id,
          action: "leave_request_decided",
          payload: {
            status,
            decision,
            comments: comments || null,
          },
        },
      });
    });

    await recalculateLeaveBalance(leaveRequest.employeeId, leaveRequest.leaveTypeId, new Date().getUTCFullYear());
  } catch {
    redirect("/dashboard/leaves?error=leave_decision_failed");
  }

  revalidatePath("/dashboard/leaves");
  redirect("/dashboard/leaves?message=leave_decided");
}
