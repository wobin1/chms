import { ForbiddenError } from "./errors";
import type { AuthContext } from "./auth-types";

export function requirePermission(session: AuthContext, permission: string) {
  if (!session.permissions.includes(permission)) {
    throw new ForbiddenError("Forbidden");
  }
}
