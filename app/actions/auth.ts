"use server";

import { redirect } from "next/navigation";

import { isAppRoleKey } from "@/lib/auth/permissions";
import { ensureProvisionedAppUser } from "@/lib/auth/provision";
import { getServerSupabaseClient } from "@/lib/supabase/server";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function login(formData: FormData) {
  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");
  const nextPath = getStringValue(formData, "next") || "/dashboard";
  const requestedRole = getStringValue(formData, "testRole");
  const selectedRole = isAppRoleKey(requestedRole) ? requestedRole : undefined;

  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }

  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=invalid_credentials");
  }

  if (data.user?.id && data.user.email) {
    await ensureProvisionedAppUser(data.user.id, data.user.email, selectedRole);
  }

  redirect(nextPath);
}

export async function signup(formData: FormData) {
  const email = getStringValue(formData, "email");
  const password = getStringValue(formData, "password");

  if (!email || !password) {
    redirect("/signup?error=missing_credentials");
  }

  const supabase = await getServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect("/signup?error=signup_failed");
  }

  redirect("/login?message=signup_success");
}

export async function logout() {
  const supabase = await getServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
