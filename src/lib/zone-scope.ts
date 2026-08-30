import type { AuthContext } from "./auth-types";

export type MemberListScope = {
  churchId: string;
  deletedAt: null;
  zoneId?: string | { in: string[] };
};

export function getVisibleMemberFilter(input: {
  churchId: string;
  permissions: string[];
  assignedZoneIds: string[];
}): MemberListScope {
  const tenant = { churchId: input.churchId, deletedAt: null };
  if (input.permissions.includes("members:manage")) {
    return tenant;
  }
  return {
    ...tenant,
    zoneId: { in: input.assignedZoneIds },
  };
}

export function constrainZoneFilter(
  scope: MemberListScope,
  requestedZoneId?: string,
): MemberListScope {
  if (!requestedZoneId) {
    return scope;
  }
  const allowedIds =
    scope.zoneId && typeof scope.zoneId === "object" ? scope.zoneId.in : null;
  if (Array.isArray(allowedIds)) {
    if (!allowedIds.includes(requestedZoneId)) {
      return { ...scope, zoneId: { in: [] } };
    }
    return { ...scope, zoneId: requestedZoneId };
  }
  return { ...scope, zoneId: requestedZoneId };
}

export function isZoneScoped(session: AuthContext) {
  return (
    !session.permissions.includes("members:manage") &&
    session.permissions.includes("members:read")
  );
}
