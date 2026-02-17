import { z } from "zod";

import { getPublicEnv } from "@/lib/env/public";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  EMPLOYEE_DOCUMENTS_BUCKET: z.string().min(1).optional(),
});

export function getServerEnv() {
  const serverEnvResult = serverEnvSchema.safeParse(process.env);
  if (!serverEnvResult.success) {
    throw new Error(
      `Invalid server environment variables: ${serverEnvResult.error.message}`,
    );
  }

  return {
    ...getPublicEnv(),
    ...serverEnvResult.data,
  };
}
