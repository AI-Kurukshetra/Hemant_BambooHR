import type { AppPermission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/server";
import { getAppSession } from "@/lib/auth/server";
import { jsonError } from "@/lib/http";

type ApiAuthResult =
  | {
      ok: true;
      session: AppSession;
    }
  | {
      ok: false;
      response: Response;
    };

export async function authorizeApi(permission?: AppPermission): Promise<ApiAuthResult> {
  const session = await getAppSession();

  if (!session) {
    return {
      ok: false,
      response: jsonError("Unauthorized", 401),
    };
  }

  if (!permission) {
    return {
      ok: true,
      session,
    };
  }

  if (!session.appUser) {
    return {
      ok: false,
      response: jsonError("Forbidden: user is not provisioned", 403),
    };
  }

  if (!hasPermission(session.roleKeys, permission)) {
    return {
      ok: false,
      response: jsonError("Forbidden", 403),
    };
  }

  return {
    ok: true,
    session,
  };
}

