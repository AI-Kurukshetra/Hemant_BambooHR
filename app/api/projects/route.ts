import { z } from "zod";

import { authorizeApi } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const createProjectSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().min(1).optional(),
  sprintDurationWeeks: z.union([z.literal(1), z.literal(2)]),
  startDateAssumption: z.string().date().optional(),
  teamModel: z.enum(["small", "medium", "large"]),
  scopeText: z.string().min(1),
  techStack: z.object({
    frontend: z.enum(["react", "angular", "nextjs"]),
    backend: z.enum(["nodejs", "java", "dotnet", "python"]),
    database: z.enum(["postgres", "mysql", "mongodb"]),
    cloud: z.enum(["aws", "azure"]),
    cicd: z.enum(["github_actions", "azure_devops"]),
    authentication: z.enum(["basic", "sso"]),
  }),
});

export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) {
    return auth.response;
  }

  const projects = await prisma.project.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      clientName: true,
      projectType: true,
      sprintDurationWeeks: true,
      startDateAssumption: true,
      teamModel: true,
      createdAt: true,
    },
  });

  return jsonOk(projects);
}

export async function POST(request: Request) {
  const auth = await authorizeApi();
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.message, 400);
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      clientName: parsed.data.clientName,
      sprintDurationWeeks: parsed.data.sprintDurationWeeks,
      startDateAssumption: parsed.data.startDateAssumption
        ? new Date(parsed.data.startDateAssumption)
        : null,
      teamModel: parsed.data.teamModel,
      scopeText: parsed.data.scopeText,
      techStack: parsed.data.techStack,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });

  return jsonOk(project);
}
