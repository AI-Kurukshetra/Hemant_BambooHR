import type { AppRoleKey } from "@/lib/auth/permissions";

const HR_MANAGE_ROLES: ReadonlySet<AppRoleKey> = new Set(["super_admin", "hr_admin"]);

export function canManageEmployees(roleKeys: readonly AppRoleKey[]) {
  return roleKeys.some((roleKey) => HR_MANAGE_ROLES.has(roleKey));
}

