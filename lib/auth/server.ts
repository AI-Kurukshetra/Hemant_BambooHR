import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import type { AppPermission, AppRoleKey } from "@/lib/auth/permissions";
import { hasPermission, isAppRoleKey } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export type AppSession = {
  authUser: User;
  appUser: {
    id: string;
    email: string;
    companyId: string;
  } | null;
  roleKeys: AppRoleKey[];
};

async function findAppUserByAuthId(userId: string) {
  return prisma.appUser.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      companyId: true,
      userRoles: {
        select: {
          role: {
            select: {
              key: true,
            },
          },
        },
      },
    },
  });
}

export async function getAppSession(): Promise<AppSession | null> {
  const supabase = await getServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  let appUser:
    | {
        id: string;
        email: string;
        companyId: string;
        userRoles: { role: { key: string } }[];
      }
    | null = null;

  try {
    appUser = await findAppUserByAuthId(user.id);
  } catch (error) {
    try {
      // Retry once for transient pooler/network hiccups.
      appUser = await findAppUserByAuthId(user.id);
    } catch {
      return {
        authUser: user,
        appUser: null,
        roleKeys: [],
      };
    }
  }

  if (!appUser) {
    return {
      authUser: user,
      appUser: null,
      roleKeys: [],
    };
  }

  const roleKeys = appUser.userRoles
    .map((entry) => entry.role.key)
    .filter((roleKey): roleKey is AppRoleKey => isAppRoleKey(roleKey));

  return {
    authUser: user,
    appUser: {
      id: appUser.id,
      email: appUser.email,
      companyId: appUser.companyId,
    },
    roleKeys,
  };
}

export async function requirePageSession(): Promise<AppSession> {
  const session = await getAppSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requirePagePermission(permission: AppPermission): Promise<AppSession> {
  const session = await requirePageSession();

  if (!session.appUser || !hasPermission(session.roleKeys, permission)) {
    redirect("/dashboard?error=forbidden");
  }

  return session;
}
