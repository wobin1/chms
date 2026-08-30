import "server-only";
import { cookies } from "next/headers";
import {
  loadUserAccess,
  publicUserFromAccess,
} from "./auth-service";
import type { AuthContext, PublicUser } from "./auth-types";
import { UnauthorizedError } from "./errors";
import {
  readSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "./session";

export { SESSION_COOKIE, sessionCookieOptions };

export type AppSession = AuthContext & { user: PublicUser };

export async function requireSession(): Promise<AppSession> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    throw new UnauthorizedError();
  }

  const claims = await readSessionToken(token);
  if (!claims) {
    throw new UnauthorizedError();
  }

  const user = await loadUserAccess(claims.userId);
  if (!user || user.status !== "ACTIVE") {
    throw new UnauthorizedError();
  }
  if (user.church?.status === "SUSPENDED") {
    throw new UnauthorizedError();
  }

  const publicUser = publicUserFromAccess(user);
  return {
    userId: user.id,
    churchId: user.churchId,
    permissions: publicUser.permissions,
    user: publicUser,
  };
}

export function toPublicUser(session: AppSession): PublicUser {
  return session.user;
}
