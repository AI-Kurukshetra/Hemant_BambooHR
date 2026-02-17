import { EmploymentStatus } from "@prisma/client";

import type { AppSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

const REQUIRED_DOCUMENT_TYPES = ["id_proof", "tax_document"];

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

function fullName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  const combined = `${firstName || ""} ${lastName || ""}`.trim();
  return combined || fallback || "Unknown";
}

export type EmployeeDashboardData = {
  employeeId: string | null;
  displayName: string;
  title: string;
  department: string;
  managerName: string;
  managerEmployeeNumber: string;
  leaveBalances: Array<{
    id: string;
    code: string;
    name: string;
    opening: number;
    used: number;
    pending: number;
    available: number;
  }>;
  recentRequests: Array<{
    id: string;
    status: string;
    startDate: Date;
    endDate: Date;
    quantity: number;
    leaveTypeName: string;
    createdAt: Date;
  }>;
  profileTasks: string[];
  pendingApprovals: Array<{
    id: string;
    employeeNumber: string;
    employeeName: string;
    leaveTypeName: string;
    startDate: Date;
    endDate: Date;
    quantity: number;
  }>;
  warnings: string[];
};

export async function getEmployeeDashboardData(session: AppSession): Promise<EmployeeDashboardData> {
  const fallbackName = session.authUser.email || "Employee";
  const data: EmployeeDashboardData = {
    employeeId: null,
    displayName: fallbackName,
    title: "Not set",
    department: "Not set",
    managerName: "Not assigned",
    managerEmployeeNumber: "",
    leaveBalances: [],
    recentRequests: [],
    profileTasks: [],
    pendingApprovals: [],
    warnings: [],
  };

  if (!session.appUser) {
    data.warnings.push("User profile is not provisioned.");
    return data;
  }

  const employee = await prisma.employee.findFirst({
    where: {
      companyId: session.appUser.companyId,
      userId: session.authUser.id,
    },
    select: {
      id: true,
      employeeNumber: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          preferredName: true,
          personalEmail: true,
          workEmail: true,
          phone: true,
          dateOfBirth: true,
          hireDate: true,
        },
      },
      documents: {
        select: {
          documentType: true,
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
          managerEmployeeRef: {
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
        },
      },
    },
  });

  if (!employee) {
    data.warnings.push("Employee profile mapping is pending. Contact HR admin.");
    return data;
  }

  data.employeeId = employee.id;
  data.displayName = fullName(
    employee.profile?.firstName,
    employee.profile?.lastName,
    fallbackName,
  );

  const currentJob = employee.jobs[0];
  if (currentJob) {
    data.title = currentJob.title;
    data.department = currentJob.department;
    data.managerName = fullName(
      currentJob.managerEmployeeRef?.profile?.firstName,
      currentJob.managerEmployeeRef?.profile?.lastName,
      "Not assigned",
    );
    data.managerEmployeeNumber = currentJob.managerEmployeeRef?.employeeNumber || "";
  } else {
    data.profileTasks.push("Add current job details (title, department, manager).");
  }

  if (!employee.profile?.workEmail) {
    data.profileTasks.push("Add work email.");
  }
  if (!employee.profile?.personalEmail) {
    data.profileTasks.push("Add personal email.");
  }
  if (!employee.profile?.phone) {
    data.profileTasks.push("Add phone number.");
  }
  if (!employee.profile?.dateOfBirth) {
    data.profileTasks.push("Add date of birth.");
  }

  const docTypes = new Set(employee.documents.map((doc) => doc.documentType.toLowerCase()));
  const missingDocTypes = REQUIRED_DOCUMENT_TYPES.filter((docType) => !docTypes.has(docType));
  if (missingDocTypes.length > 0) {
    data.profileTasks.push(`Upload mandatory documents: ${missingDocTypes.join(", ")}.`);
  }

  const currentYear = new Date().getUTCFullYear();
  const [balances, requests, directReportRows] = await Promise.all([
    prisma.employeeLeaveBalance.findMany({
      where: {
        employeeId: employee.id,
        balanceYear: currentYear,
      },
      orderBy: {
        leaveType: {
          code: "asc",
        },
      },
      select: {
        id: true,
        openingBalance: true,
        usedAmount: true,
        pendingAmount: true,
        availableAmount: true,
        leaveType: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId: employee.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        quantity: true,
        createdAt: true,
        leaveType: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.employeeJob.findMany({
      where: {
        managerEmployeeId: employee.id,
        isCurrent: true,
      },
      select: {
        employeeId: true,
      },
    }),
  ]);

  data.leaveBalances = balances.map((balance) => ({
    id: balance.id,
    code: balance.leaveType.code,
    name: balance.leaveType.name,
    opening: toNumber(balance.openingBalance),
    used: toNumber(balance.usedAmount),
    pending: toNumber(balance.pendingAmount),
    available: toNumber(balance.availableAmount),
  }));
  data.recentRequests = requests.map((request) => ({
    id: request.id,
    status: request.status,
    startDate: request.startDate,
    endDate: request.endDate,
    quantity: toNumber(request.quantity),
    leaveTypeName: request.leaveType.name,
    createdAt: request.createdAt,
  }));

  const directReportIds = [...new Set(directReportRows.map((row) => row.employeeId))];
  if (directReportIds.length > 0) {
    const pendingApprovals = await prisma.leaveRequest.findMany({
      where: {
        status: "pending",
        employeeId: {
          in: directReportIds,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 10,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        quantity: true,
        leaveType: {
          select: {
            name: true,
          },
        },
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
      },
    });
    data.pendingApprovals = pendingApprovals.map((item) => ({
      id: item.id,
      employeeNumber: item.employee.employeeNumber,
      employeeName: fullName(item.employee.profile?.firstName, item.employee.profile?.lastName),
      leaveTypeName: item.leaveType.name,
      startDate: item.startDate,
      endDate: item.endDate,
      quantity: toNumber(item.quantity),
    }));
  }

  return data;
}

export type AdminDashboardData = {
  headcount: {
    total: number;
    active: number;
    inactive: number;
    newHires30d: number;
  };
  pendingLeaveRequests: Array<{
    id: string;
    employeeNumber: string;
    employeeName: string;
    leaveTypeName: string;
    startDate: Date;
    endDate: Date;
    quantity: number;
    createdAt: Date;
  }>;
  complianceAlerts: Array<{
    id: string;
    employeeNumber: string;
    employeeName: string;
    alertType: "profile" | "document" | "job";
    message: string;
  }>;
};

export async function getAdminDashboardData(session: AppSession): Promise<AdminDashboardData> {
  if (!session.appUser) {
    return {
      headcount: { total: 0, active: 0, inactive: 0, newHires30d: 0 },
      pendingLeaveRequests: [],
      complianceAlerts: [],
    };
  }

  const companyId = session.appUser.companyId;
  const hiresAfter = new Date();
  hiresAfter.setUTCDate(hiresAfter.getUTCDate() - 30);

  const [total, active, newHires30d, pendingLeaveRequests, employeesForCompliance] = await Promise.all([
    prisma.employee.count({
      where: {
        companyId,
      },
    }),
    prisma.employee.count({
      where: {
        companyId,
        jobs: {
          some: {
            isCurrent: true,
            status: EmploymentStatus.active,
          },
        },
      },
    }),
    prisma.employeeProfile.count({
      where: {
        employee: {
          companyId,
        },
        hireDate: {
          gte: hiresAfter,
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: "pending",
        employee: {
          companyId,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 20,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        quantity: true,
        createdAt: true,
        leaveType: {
          select: {
            name: true,
          },
        },
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
      },
    }),
    prisma.employee.findMany({
      where: {
        companyId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
      select: {
        id: true,
        employeeNumber: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            personalEmail: true,
            workEmail: true,
            phone: true,
            dateOfBirth: true,
          },
        },
        jobs: {
          where: {
            isCurrent: true,
          },
          take: 1,
          select: {
            id: true,
            status: true,
            title: true,
            department: true,
          },
        },
        documents: {
          select: {
            documentType: true,
          },
        },
      },
    }),
  ]);

  const complianceAlerts: AdminDashboardData["complianceAlerts"] = [];
  for (const employee of employeesForCompliance) {
    const employeeName = fullName(employee.profile?.firstName, employee.profile?.lastName);
    const currentJob = employee.jobs[0];
    if (!currentJob) {
      complianceAlerts.push({
        id: `${employee.id}-job-missing`,
        employeeNumber: employee.employeeNumber,
        employeeName,
        alertType: "job",
        message: "Current job record is missing.",
      });
    } else if (currentJob.status !== EmploymentStatus.active) {
      complianceAlerts.push({
        id: `${employee.id}-job-status`,
        employeeNumber: employee.employeeNumber,
        employeeName,
        alertType: "job",
        message: `Current employment status is ${currentJob.status}.`,
      });
    }

    const missingProfileFields: string[] = [];
    if (!employee.profile?.workEmail) missingProfileFields.push("work email");
    if (!employee.profile?.personalEmail) missingProfileFields.push("personal email");
    if (!employee.profile?.phone) missingProfileFields.push("phone");
    if (!employee.profile?.dateOfBirth) missingProfileFields.push("date of birth");
    if (missingProfileFields.length > 0) {
      complianceAlerts.push({
        id: `${employee.id}-profile`,
        employeeNumber: employee.employeeNumber,
        employeeName,
        alertType: "profile",
        message: `Incomplete profile: missing ${missingProfileFields.join(", ")}.`,
      });
    }

    const docTypes = new Set(employee.documents.map((doc) => doc.documentType.toLowerCase()));
    const missingDocs = REQUIRED_DOCUMENT_TYPES.filter((docType) => !docTypes.has(docType));
    if (missingDocs.length > 0) {
      complianceAlerts.push({
        id: `${employee.id}-docs`,
        employeeNumber: employee.employeeNumber,
        employeeName,
        alertType: "document",
        message: `Missing mandatory docs: ${missingDocs.join(", ")}.`,
      });
    }
  }

  return {
    headcount: {
      total,
      active,
      inactive: Math.max(total - active, 0),
      newHires30d,
    },
    pendingLeaveRequests: pendingLeaveRequests.map((request) => ({
      id: request.id,
      employeeNumber: request.employee.employeeNumber,
      employeeName: fullName(request.employee.profile?.firstName, request.employee.profile?.lastName),
      leaveTypeName: request.leaveType.name,
      startDate: request.startDate,
      endDate: request.endDate,
      quantity: toNumber(request.quantity),
      createdAt: request.createdAt,
    })),
    complianceAlerts: complianceAlerts.slice(0, 30),
  };
}
