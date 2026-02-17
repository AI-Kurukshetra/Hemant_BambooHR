import { z } from "zod";

import { canManageEmployees } from "@/lib/auth/employee-scope";
import { getAppSession } from "@/lib/auth/server";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    employeeId: string;
  }>;
};

const completeUploadSchema = z.object({
  title: z.string().min(1),
  documentType: z.string().min(1).default("general"),
  storageBucket: z.string().min(1),
  storagePath: z.string().min(1),
});

export async function POST(request: Request, context: RouteContext) {
  const { employeeId } = await context.params;
  const session = await getAppSession();

  if (!session || !session.appUser) {
    return jsonError("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = completeUploadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: session.appUser.companyId,
    },
    select: {
      userId: true,
    },
  });

  if (!employee) {
    return jsonError("Employee not found", 404);
  }

  const canManage = canManageEmployees(session.roleKeys);
  const isSelf = employee.userId === session.authUser.id;
  if (!canManage && !isSelf) {
    return jsonError("Forbidden", 403);
  }

  const created = await prisma.employeeDocument.create({
    data: {
      employeeId,
      documentType: parsed.data.documentType,
      title: parsed.data.title,
      storageBucket: parsed.data.storageBucket,
      storagePath: parsed.data.storagePath,
      uploadedByUserId: session.authUser.id,
    },
    select: {
      id: true,
    },
  });

  return jsonOk({ id: created.id });
}
