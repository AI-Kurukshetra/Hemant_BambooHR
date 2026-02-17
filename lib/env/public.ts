import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export function getPublicEnv() {
  const publicEnvResult = publicEnvSchema.safeParse(process.env);
  if (!publicEnvResult.success) {
    throw new Error(
      `Invalid public environment variables: ${publicEnvResult.error.message}`,
    );
  }

  return publicEnvResult.data;
}
