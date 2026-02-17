import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { authorizeApi } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

const createOutputSchema = z.object({
  output: z.record(z.unknown()),
});

export async function GET(_request: Request, context: RouteContext) {
  const auth = await authorizeApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { projectId } = await context.params;

  const outputs = await prisma.projectOutput.findMany({
    where: {
      projectId,
    },
    orderBy: {
      version: "desc",
    },
    select: {
      id: true,
      version: true,
      createdAt: true,
      output: true,
    },
  });

  return jsonOk(outputs);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await authorizeApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { projectId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = createOutputSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const existing = await prisma.projectOutput.count({
    where: {
      projectId,
    },
  });

  const output = await prisma.projectOutput.create({
    data: {
      projectId,
      version: existing + 1,
      output: parsed.data.output as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      version: true,
      createdAt: true,
    },
  });

  return jsonOk(output);
}
