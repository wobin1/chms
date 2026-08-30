import { ForbiddenError } from "./errors";
import type { AuthContext } from "./auth-types";

export function tenantWhere<T extends object>(
  churchId: string,
  extra?: T,
): { churchId: string } & T {
  return { churchId, ...(extra as T) };
}

export function requireChurch(session: AuthContext): string {
  if (!session.churchId) {
    throw new ForbiddenError("A church context is required");
  }
  return session.churchId;
}
