import { NextResponse } from "next/server";

import { canManageEmployees } from "@/lib/auth/employee-scope";
import { getAppSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    employeeId: string;
    documentId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { employeeId, documentId } = await context.params;
  const session = await getAppSession();

  if (!session || !session.appUser) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const document = await prisma.employeeDocument.findFirst({
    where: {
      id: documentId,
      employeeId,
      employee: {
        companyId: session.appUser.companyId,
      },
    },
    select: {
      storageBucket: true,
      storagePath: true,
      employee: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const canManage = canManageEmployees(session.roleKeys);
  const isSelf = document.employee.userId === session.authUser.id;

  if (!canManage && !isSelf) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(document.storageBucket)
    .createSignedUrl(document.storagePath, 60 * 5);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ ok: false, error: "Could not generate download URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
