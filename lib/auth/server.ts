import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import type { AppPermission, AppRoleKey } from "@/lib/auth/permissions";
import { hasPermission, normalizeRoleKey } from "@/lib/auth/permissions";
import { ensureProvisionedAppUser } from "@/lib/auth/provision";
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

export const getAppSession = cache(async (): Promise<AppSession | null> => {
  const supabase = await getServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }
  const metadataRoleRaw = user.user_metadata?.app_role;
  const metadataRole = normalizeRoleKey(
    typeof metadataRoleRaw === "string" ? metadataRoleRaw : null,
  );

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
        roleKeys: [metadataRole || "employee"],
      };
    }
  }

  if (!appUser && user.email) {
    try {
      await ensureProvisionedAppUser(user.id, user.email, metadataRole || "employee");
      appUser = await findAppUserByAuthId(user.id);
    } catch {
      // keep fallback behavior below
    }
  }

  if (!appUser) {
    return {
      authUser: user,
      appUser: null,
      roleKeys: [metadataRole || "employee"],
    };
  }

  let roleKeys = appUser.userRoles
    .map((entry) => normalizeRoleKey(entry.role.key))
    .filter((roleKey): roleKey is AppRoleKey => !!roleKey);

  // Self-heal role assignment if user exists in app DB but has no mapped role.
  if (roleKeys.length === 0 && user.email) {
    try {
      await ensureProvisionedAppUser(user.id, user.email, metadataRole || "employee");
      const refreshedUser = await findAppUserByAuthId(user.id);
      if (refreshedUser) {
        appUser = refreshedUser;
        roleKeys = refreshedUser.userRoles
          .map((entry) => normalizeRoleKey(entry.role.key))
          .filter((roleKey): roleKey is AppRoleKey => !!roleKey);
      }
    } catch {
      // keep graceful fallback below
    }
  }

  if (roleKeys.length === 0 && metadataRole) {
    roleKeys = [metadataRole];
  }
  if (roleKeys.length === 0) {
    roleKeys = ["employee"];
  }

  return {
    authUser: user,
    appUser: {
      id: appUser.id,
      email: appUser.email,
      companyId: appUser.companyId,
    },
    roleKeys,
  };
});

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
