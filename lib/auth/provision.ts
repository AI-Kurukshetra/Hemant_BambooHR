import { prisma } from "@/lib/prisma";
import type { AppRoleKey } from "@/lib/auth/permissions";

const DEFAULT_COMPANY_NAME = "Default Company";
const ROLE_META: Record<AppRoleKey, { name: string; description: string }> = {
  super_admin: {
    name: "Super Admin",
    description: "Full tenant control, role assignment, and unrestricted access.",
  },
  hr_admin: {
    name: "HR Admin",
    description: "Manages employee records, documents, leave policies, and approvals.",
  },
  payroll_manager: {
    name: "Payroll Manager",
    description: "Manages payroll setup, payroll cycles, and payslip publishing.",
  },
  manager: {
    name: "Manager",
    description: "Manages direct reports and approves leave requests.",
  },
  employee: {
    name: "Employee",
    description: "Self-service access to own profile, leave, and payslips.",
  },
  auditor: {
    name: "Auditor",
    description: "Read-only access to records and audit trails.",
  },
};

export async function ensureProvisionedAppUser(
  authUserId: string,
  email: string,
  selectedRole?: AppRoleKey,
) {
  let company = await prisma.company.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!company) {
    company = await prisma.company.create({
      data: { name: DEFAULT_COMPANY_NAME },
      select: { id: true },
    });
  }

  await prisma.$transaction(async (tx) => {
    const appUser = await tx.appUser.upsert({
      where: { id: authUserId },
      update: {
        email,
        companyId: company.id,
        isActive: true,
      },
      create: {
        id: authUserId,
        email,
        companyId: company.id,
        isActive: true,
      },
      select: { id: true, companyId: true },
    });

    const preferredRole: AppRoleKey = selectedRole || "employee";
    const roleMeta = ROLE_META[preferredRole];

    const role = await tx.role.upsert({
      where: {
        companyId_key: {
          companyId: appUser.companyId,
          key: preferredRole,
        },
      },
      update: {
        name: roleMeta.name,
        description: roleMeta.description,
      },
      create: {
        companyId: appUser.companyId,
        key: preferredRole,
        name: roleMeta.name,
        description: roleMeta.description,
      },
      select: { id: true },
    });

    if (selectedRole) {
      await tx.userRole.deleteMany({
        where: {
          companyId: appUser.companyId,
          userId: appUser.id,
        },
      });
    }

    const existingAssignment = await tx.userRole.findFirst({
      where: {
        companyId: appUser.companyId,
        userId: appUser.id,
        roleId: role.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingAssignment) {
      await tx.userRole.create({
        data: {
          companyId: appUser.companyId,
          userId: appUser.id,
          roleId: role.id,
        },
      });
    }
  });
}
