import { z } from "zod";

import { canManageEmployees } from "@/lib/auth/employee-scope";
import { getAppSession } from "@/lib/auth/server";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getEmployeeDocumentsBucket, getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    employeeId: string;
  }>;
};

const uploadUrlSchema = z.object({
  title: z.string().min(1),
  documentType: z.string().min(1).default("general"),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(request: Request, context: RouteContext) {
  const { employeeId } = await context.params;
  const session = await getAppSession();

  if (!session || !session.appUser) {
    return jsonError("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadUrlSchema.safeParse(body);
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

  const admin = getSupabaseAdminClient();
  const bucket = getEmployeeDocumentsBucket();
  const safeName = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${session.appUser.companyId}/${employeeId}/${Date.now()}_${safeName}`;

  let uploadResult = await admin.storage.from(bucket).createSignedUploadUrl(storagePath);

  if (uploadResult.error) {
    const createBucketResult = await admin.storage.createBucket(bucket, { public: false });
    // Ignore conflict if bucket already exists and retry signed URL once.
    if (
      createBucketResult.error &&
      !createBucketResult.error.message.toLowerCase().includes("already exists")
    ) {
      const message =
        process.env.NODE_ENV === "development"
          ? `Could not create storage bucket: ${createBucketResult.error.message}`
          : "Could not initialize upload";
      return jsonError(message, 500);
    }
    uploadResult = await admin.storage.from(bucket).createSignedUploadUrl(storagePath);
  }

  if (uploadResult.error || !uploadResult.data) {
    const message =
      process.env.NODE_ENV === "development"
        ? `Could not initialize upload: ${uploadResult.error?.message || "unknown error"}`
        : "Could not initialize upload";
    return jsonError(message, 500);
  }

  return jsonOk({
    title: parsed.data.title,
    documentType: parsed.data.documentType,
    storageBucket: bucket,
    storagePath,
    token: uploadResult.data.token,
  });
}
