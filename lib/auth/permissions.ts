export const APP_ROLES = [
  "hr_admin",
  "employee",
] as const;

export type AppRoleKey = (typeof APP_ROLES)[number];
const APP_ROLE_SET: ReadonlySet<string> = new Set(APP_ROLES);

export const PERMISSIONS = [
  "employee:read",
  "employee:create",
  "employee:update",
  "employee:document:read",
  "employee:document:upload",
  "employee:document:delete",
  "leave:policy:read",
  "leave:policy:manage",
  "leave:request:create",
  "leave:request:read:self",
  "leave:request:read:team",
  "leave:request:approve",
  "leave:balance:read:self",
  "leave:balance:read:team",
  "payroll:config:read",
  "payroll:config:manage",
  "payroll:run:read",
  "payroll:run:manage",
  "payroll:payslip:read:self",
  "payroll:payslip:publish",
  "audit:read",
  "role:manage",
] as const;

export type AppPermission = (typeof PERMISSIONS)[number];

export function isAppRoleKey(value: string): value is AppRoleKey {
  return APP_ROLE_SET.has(value);
}

const ROLE_ALIASES: Record<string, AppRoleKey> = {
  hr_manager: "hr_admin",
  admin: "hr_admin",
  super_admin: "hr_admin",
  payroll_manager: "hr_admin",
  manager: "employee",
  auditor: "employee",
  "hr admin": "hr_admin",
};

export function normalizeRoleKey(value: string | null | undefined): AppRoleKey | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (isAppRoleKey(normalized)) {
    return normalized;
  }
  return ROLE_ALIASES[normalized] || null;
}

export const ROLE_PERMISSIONS: Record<AppRoleKey, readonly AppPermission[]> = {
  hr_admin: [
    "employee:read",
    "employee:create",
    "employee:update",
    "employee:document:read",
    "employee:document:upload",
    "employee:document:delete",
    "leave:policy:read",
    "leave:policy:manage",
    "leave:request:read:self",
    "leave:request:read:team",
    "leave:request:approve",
    "leave:balance:read:self",
    "leave:balance:read:team",
    "payroll:config:read",
    "payroll:run:read",
    "audit:read",
  ],
  employee: [
    "employee:read",
    "employee:update",
    "employee:document:read",
    "employee:document:upload",
    "leave:request:create",
    "leave:request:read:self",
    "leave:balance:read:self",
    "payroll:payslip:read:self",
  ],
};

export function hasPermission(
  roleKeys: readonly AppRoleKey[],
  permission: AppPermission,
): boolean {
  return roleKeys.some((roleKey) => ROLE_PERMISSIONS[roleKey].includes(permission));
}
