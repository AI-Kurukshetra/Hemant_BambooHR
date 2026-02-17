import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env/server";

export function getSupabaseAdminClient() {
  const serverEnv = getServerEnv();
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for storage operations.");
  }

  return createClient(serverEnv.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getEmployeeDocumentsBucket() {
  const serverEnv = getServerEnv();
  return serverEnv.EMPLOYEE_DOCUMENTS_BUCKET || "employee-documents";
}

