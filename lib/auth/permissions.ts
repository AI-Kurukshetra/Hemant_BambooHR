export const APP_ROLES = [
  "super_admin",
  "hr_admin",
  "payroll_manager",
  "manager",
  "employee",
  "auditor",
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

export const ROLE_PERMISSIONS: Record<AppRoleKey, readonly AppPermission[]> = {
  super_admin: [...PERMISSIONS],
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
  payroll_manager: [
    "employee:read",
    "employee:document:read",
    "leave:request:read:team",
    "leave:balance:read:team",
    "payroll:config:read",
    "payroll:config:manage",
    "payroll:run:read",
    "payroll:run:manage",
    "payroll:payslip:publish",
    "audit:read",
  ],
  manager: [
    "employee:read",
    "employee:document:read",
    "leave:request:create",
    "leave:request:read:self",
    "leave:request:read:team",
    "leave:request:approve",
    "leave:balance:read:self",
    "leave:balance:read:team",
    "payroll:run:read",
    "payroll:payslip:read:self",
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
  auditor: [
    "employee:read",
    "employee:document:read",
    "leave:policy:read",
    "leave:request:read:team",
    "leave:balance:read:team",
    "payroll:config:read",
    "payroll:run:read",
    "audit:read",
  ],
};

export function hasPermission(
  roleKeys: readonly AppRoleKey[],
  permission: AppPermission,
): boolean {
  return roleKeys.some((roleKey) => ROLE_PERMISSIONS[roleKey].includes(permission));
}
