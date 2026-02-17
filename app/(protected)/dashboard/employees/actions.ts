"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canManageEmployees } from "@/lib/auth/employee-scope";
import { getAppSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalDate(value: string) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getScopedEmployee(employeeId: string) {
  const session = await getAppSession();

  if (!session || !session.appUser) {
    redirect("/login");
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: session.appUser.companyId,
    },
    select: {
      id: true,
      userId: true,
      companyId: true,
    },
  });

  if (!employee) {
    redirect("/dashboard/employees?error=employee_not_found");
  }

  const canManage = canManageEmployees(session.roleKeys);
  const isSelf = employee.userId === session.authUser.id;

  if (!canManage && !isSelf) {
    redirect("/dashboard?error=forbidden");
  }

  return { session, employee, canManage, isSelf };
}

export async function createEmployeeAction(formData: FormData) {
  const session = await getAppSession();

  if (!session || !session.appUser) {
    redirect("/login");
  }

  if (!canManageEmployees(session.roleKeys)) {
    redirect("/dashboard?error=forbidden");
  }

  const employeeNumber = getString(formData, "employeeNumber");
  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const workEmail = getString(formData, "workEmail");
  const hireDateInput = getString(formData, "hireDate");
  const title = getString(formData, "title");
  const department = getString(formData, "department");
  const employmentType = getString(formData, "employmentType");
  const status = getString(formData, "status") || "active";
  const managerEmployeeId = getString(formData, "managerEmployeeId");

  if (
    !employeeNumber ||
    !firstName ||
    !lastName ||
    !hireDateInput ||
    !title ||
    !department ||
    !employmentType
  ) {
    redirect("/dashboard/employees?error=missing_required_fields");
  }

  const hireDate = getOptionalDate(hireDateInput);
  if (!hireDate) {
    redirect("/dashboard/employees?error=invalid_hire_date");
  }

  const linkedAppUser = workEmail
    ? await prisma.appUser.findFirst({
        where: {
          companyId: session.appUser.companyId,
          email: workEmail,
        },
        select: { id: true },
      })
    : null;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          companyId: session.appUser!.companyId,
          employeeNumber,
          userId: linkedAppUser?.id,
          profile: {
            create: {
              firstName,
              lastName,
              workEmail: workEmail || null,
              hireDate,
            },
          },
          jobs: {
            create: {
              title,
              department,
              employmentType,
              status: status as "active" | "inactive" | "terminated" | "on_notice",
              managerEmployeeId: managerEmployeeId || null,
              effectiveFrom: new Date(),
              isCurrent: true,
            },
          },
        },
        select: { id: true, userId: true },
      });

      if (employee.userId) {
        const employeeRole = await tx.role.findFirst({
          where: {
            companyId: session.appUser!.companyId,
            key: "employee",
          },
          select: { id: true },
        });

        if (employeeRole) {
          const existingAssignment = await tx.userRole.findFirst({
            where: {
              companyId: session.appUser!.companyId,
              userId: employee.userId,
              roleId: employeeRole.id,
            },
            select: { id: true },
          });

          if (!existingAssignment) {
            await tx.userRole.create({
              data: {
                companyId: session.appUser!.companyId,
                userId: employee.userId,
                roleId: employeeRole.id,
              },
            });
          }
        }
      }

      return employee;
    });

    revalidatePath("/dashboard/employees");
    revalidatePath(`/dashboard/employees/${created.id}`);
    redirect(`/dashboard/employees/${created.id}?message=employee_created`);
  } catch {
    redirect("/dashboard/employees?error=employee_create_failed");
  }
}

export async function updateEmployeeAction(formData: FormData) {
  const employeeId = getString(formData, "employeeId");
  const { canManage } = await getScopedEmployee(employeeId);

  if (!canManage) {
    redirect("/dashboard?error=forbidden");
  }

  const employeeNumber = getString(formData, "employeeNumber");
  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const preferredName = getString(formData, "preferredName");
  const workEmail = getString(formData, "workEmail");
  const personalEmail = getString(formData, "personalEmail");
  const phone = getString(formData, "phone");

  if (!employeeNumber || !firstName || !lastName) {
    redirect(`/dashboard/employees/${employeeId}?error=missing_required_fields`);
  }

  try {
    await prisma.$transaction([
      prisma.employee.update({
        where: { id: employeeId },
        data: {
          employeeNumber,
        },
      }),
      prisma.employeeProfile.update({
        where: {
          employeeId,
        },
        data: {
          firstName,
          lastName,
          preferredName: preferredName || null,
          workEmail: workEmail || null,
          personalEmail: personalEmail || null,
          phone: phone || null,
        },
      }),
    ]);

    revalidatePath("/dashboard/employees");
    revalidatePath(`/dashboard/employees/${employeeId}`);
    redirect(`/dashboard/employees/${employeeId}?message=employee_updated`);
  } catch {
    redirect(`/dashboard/employees/${employeeId}?error=employee_update_failed`);
  }
}

export async function updateOwnProfileAction(formData: FormData) {
  const employeeId = getString(formData, "employeeId");
  const { isSelf } = await getScopedEmployee(employeeId);

  if (!isSelf) {
    redirect("/dashboard?error=forbidden");
  }

  const preferredName = getString(formData, "preferredName");
  const personalEmail = getString(formData, "personalEmail");
  const phone = getString(formData, "phone");

  try {
    await prisma.employeeProfile.update({
      where: {
        employeeId,
      },
      data: {
        preferredName: preferredName || null,
        personalEmail: personalEmail || null,
        phone: phone || null,
      },
    });

    revalidatePath(`/dashboard/employees/${employeeId}`);
    redirect(`/dashboard/employees/${employeeId}?message=profile_updated`);
  } catch {
    redirect(`/dashboard/employees/${employeeId}?error=profile_update_failed`);
  }
}

export async function addEmployeeJobAction(formData: FormData) {
  const employeeId = getString(formData, "employeeId");
  const { canManage } = await getScopedEmployee(employeeId);

  if (!canManage) {
    redirect("/dashboard?error=forbidden");
  }

  const title = getString(formData, "title");
  const department = getString(formData, "department");
  const location = getString(formData, "location");
  const employmentType = getString(formData, "employmentType");
  const status = getString(formData, "status") || "active";
  const managerEmployeeId = getString(formData, "managerEmployeeId");
  const effectiveFromInput = getString(formData, "effectiveFrom");

  if (!title || !department || !employmentType || !effectiveFromInput) {
    redirect(`/dashboard/employees/${employeeId}?error=missing_job_fields`);
  }

  const effectiveFrom = getOptionalDate(effectiveFromInput);
  if (!effectiveFrom) {
    redirect(`/dashboard/employees/${employeeId}?error=invalid_job_date`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.employeeJob.updateMany({
        where: {
          employeeId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
          effectiveTo: effectiveFrom,
        },
      });

      await tx.employeeJob.create({
        data: {
          employeeId,
          title,
          department,
          location: location || null,
          employmentType,
          status: status as "active" | "inactive" | "terminated" | "on_notice",
          managerEmployeeId: managerEmployeeId || null,
          effectiveFrom,
          isCurrent: true,
        },
      });
    });

    revalidatePath("/dashboard/employees");
    revalidatePath(`/dashboard/employees/${employeeId}`);
    redirect(`/dashboard/employees/${employeeId}?message=job_added`);
  } catch {
    redirect(`/dashboard/employees/${employeeId}?error=job_add_failed`);
  }
}

export async function deleteEmployeeDocumentAction(formData: FormData) {
  const employeeId = getString(formData, "employeeId");
  const documentId = getString(formData, "documentId");
  const { canManage } = await getScopedEmployee(employeeId);

  if (!canManage) {
    redirect("/dashboard?error=forbidden");
  }

  if (!documentId) {
    redirect(`/dashboard/employees/${employeeId}?error=document_delete_failed`);
  }

  const document = await prisma.employeeDocument.findFirst({
    where: {
      id: documentId,
      employeeId,
    },
    select: {
      id: true,
      storageBucket: true,
      storagePath: true,
    },
  });

  if (!document) {
    redirect(`/dashboard/employees/${employeeId}?error=document_not_found`);
  }

  try {
    const admin = getSupabaseAdminClient();
    await admin.storage.from(document.storageBucket).remove([document.storagePath]);

    await prisma.employeeDocument.delete({
      where: {
        id: document.id,
      },
    });
  } catch {
    redirect(`/dashboard/employees/${employeeId}?error=document_delete_failed`);
  }

  revalidatePath(`/dashboard/employees/${employeeId}`);
  redirect(`/dashboard/employees/${employeeId}?message=document_deleted`);
}
