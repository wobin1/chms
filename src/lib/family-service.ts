import "server-only";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError, ValidationError } from "./errors";
import { prisma } from "./db";
import {
  assertMemberBelongsToChurch,
  assertZoneBelongsToChurch,
} from "./member-rules";
import { requirePermission } from "./permissions";
import { throwIfUniqueConflict } from "./prisma-errors";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";
import { listAssignedZoneIds } from "./zone-service";

type FamilyListFilters = ListFilters & { zoneId?: string };

const familyInclude = {
  zone: { select: { id: true, name: true, familyOfTheWeekId: true } },
  members: {
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          membershipNumber: true,
          deletedAt: true,
          zone: { select: { name: true } },
        },
      },
    },
    orderBy: { member: { lastName: "asc" as const } },
  },
  children: {
    include: {
      guardians: {
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              membershipNumber: true,
            },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    },
    orderBy: { lastName: "asc" as const },
  },
  _count: { select: { members: true, children: true } },
};

function withFamilyOfTheWeekFlag<
  T extends { id: string; zone?: { familyOfTheWeekId: string | null } | null },
>(family: T) {
  return {
    ...family,
    isFamilyOfTheWeek: family.zone?.familyOfTheWeekId === family.id,
  };
}

function isFamilyZoneScoped(session: AuthContext) {
  return (
    !session.permissions.includes("families:manage") &&
    session.permissions.includes("families:read")
  );
}

async function familyZoneScope(session: AuthContext, churchId: string) {
  if (!isFamilyZoneScoped(session)) {
    return undefined;
  }
  const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
  return { zoneId: { in: assignedZoneIds } };
}

function constrainFamilyZone(
  zoneScope: { zoneId: { in: string[] } } | undefined,
  requestedZoneId?: string,
) {
  if (!requestedZoneId) {
    return zoneScope;
  }
  if (!zoneScope) {
    return { zoneId: requestedZoneId };
  }
  if (!zoneScope.zoneId.in.includes(requestedZoneId)) {
    return { zoneId: { in: [] as string[] } };
  }
  return { zoneId: requestedZoneId };
}

async function assertFamilyZone(churchId: string, zoneId: string) {
  const zone = await prisma.zone.findFirst({
    where: { id: zoneId, churchId },
    select: { id: true, churchId: true },
  });
  assertZoneBelongsToChurch(zone, churchId);
  return zone;
}

export async function listFamilies(
  session: AuthContext,
  filters: FamilyListFilters = {},
) {
  requirePermission(session, "families:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const zoneScope = constrainFamilyZone(
    await familyZoneScope(session, churchId),
    filters.zoneId,
  );
  const where = {
    ...tenantWhere(churchId),
    ...zoneScope,
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" as const } },
            { address: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.family.findMany({
      where,
      orderBy: { name: "asc" },
      include: familyInclude,
      skip,
      take,
    }),
    prisma.family.count({ where }),
  ]);
  return {
    items: items.map((family) => withFamilyOfTheWeekFlag(family)),
    total,
    page,
    pageSize,
  };
}

export async function getFamily(session: AuthContext, familyId: string) {
  requirePermission(session, "families:read");
  const churchId = requireChurch(session);
  const family = await prisma.family.findFirst({
    where: tenantWhere(churchId, { id: familyId }),
    include: familyInclude,
  });
  if (!family) {
    throw new NotFoundError();
  }
  if (isFamilyZoneScoped(session)) {
    const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
    if (!assignedZoneIds.includes(family.zoneId)) {
      throw new NotFoundError();
    }
  }
  return withFamilyOfTheWeekFlag(family);
}

export async function listZoneFamilies(session: AuthContext, zoneId: string) {
  requirePermission(session, "families:read");
  const churchId = requireChurch(session);
  const zone = await prisma.zone.findFirst({
    where: tenantWhere(churchId, { id: zoneId }),
  });
  if (!zone) {
    throw new NotFoundError();
  }
  if (isFamilyZoneScoped(session)) {
    const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
    if (!assignedZoneIds.includes(zoneId)) {
      throw new NotFoundError();
    }
  }
  return listFamilies(session, { zoneId, pageSize: 50 });
}

export async function createFamily(
  session: AuthContext,
  input: { name: string; address?: string | null; zoneId: string },
) {
  requirePermission(session, "families:manage");
  const churchId = requireChurch(session);
  await assertFamilyZone(churchId, input.zoneId);
  try {
    const family = await prisma.family.create({
      data: {
        churchId,
        zoneId: input.zoneId,
        name: input.name.trim(),
        address: input.address?.trim() || null,
      },
      include: familyInclude,
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "family.create",
      entityType: "family",
      entityId: family.id,
      newData: { name: family.name, zoneId: family.zoneId },
    });
    return withFamilyOfTheWeekFlag(family);
  } catch (error) {
    throwIfUniqueConflict(error, "A family with that name already exists");
  }
}

export async function updateFamily(
  session: AuthContext,
  familyId: string,
  input: {
    name?: string;
    address?: string | null;
    zoneId?: string;
    familyOfTheWeek?: boolean;
  },
) {
  requirePermission(session, "families:read");
  const existing = await getFamily(session, familyId);
  const shouldUpdateProfile =
    input.name !== undefined ||
    input.address !== undefined ||
    input.zoneId !== undefined;
  if (shouldUpdateProfile) {
    requirePermission(session, "families:manage");
  }
  if (input.zoneId) {
    await assertFamilyZone(existing.churchId, input.zoneId);
  }
  let family: { id: string; zoneId?: string; zone?: { familyOfTheWeekId: string | null } | null } =
    existing;
  if (shouldUpdateProfile) {
    const nextZoneId = input.zoneId ?? existing.zoneId;
    if (nextZoneId !== existing.zoneId && existing.isFamilyOfTheWeek) {
      await prisma.zone.update({
        where: { id: existing.zoneId },
        data: { familyOfTheWeekId: null },
      });
    }
    try {
      family = await prisma.family.update({
        where: { id: existing.id },
        data: {
          name: input.name?.trim(),
          address:
            input.address === undefined
              ? undefined
              : input.address?.trim() || null,
          zoneId: input.zoneId,
        },
        include: familyInclude,
      });
      await writeAuditLog({
        churchId: existing.churchId,
        userId: session.userId,
        action: "family.update",
        entityType: "family",
        entityId: family.id,
        newData: input.zoneId ? { zoneId: input.zoneId } : undefined,
      });
    } catch (error) {
      throwIfUniqueConflict(error, "A family with that name already exists");
    }
  }

  const zoneId = family.zoneId ?? existing.zoneId;
  if (input.familyOfTheWeek === true) {
    await prisma.zone.update({
      where: { id: zoneId },
      data: { familyOfTheWeekId: existing.id },
    });
    await writeAuditLog({
      churchId: existing.churchId,
      userId: session.userId,
      action: "family.family_of_the_week.set",
      entityType: "family",
      entityId: existing.id,
      newData: { familyOfTheWeekId: existing.id, zoneId },
    });
    return withFamilyOfTheWeekFlag({
      ...family,
      id: existing.id,
      zone: { familyOfTheWeekId: existing.id },
    });
  }
  if (input.familyOfTheWeek === false && existing.isFamilyOfTheWeek) {
    await prisma.zone.update({
      where: { id: existing.zoneId },
      data: { familyOfTheWeekId: null },
    });
    await writeAuditLog({
      churchId: existing.churchId,
      userId: session.userId,
      action: "family.family_of_the_week.clear",
      entityType: "family",
      entityId: existing.id,
      oldData: { familyOfTheWeekId: existing.id, zoneId: existing.zoneId },
    });
    return withFamilyOfTheWeekFlag({
      ...family,
      id: existing.id,
      zone: { familyOfTheWeekId: null },
    });
  }

  return withFamilyOfTheWeekFlag(family);
}

export async function addFamilyMember(
  session: AuthContext,
  familyId: string,
  input: { memberId: string; relationship: string },
) {
  requirePermission(session, "families:manage");
  const churchId = requireChurch(session);
  const family = await getFamily(session, familyId);
  const member = await prisma.member.findFirst({
    where: {
      id: input.memberId,
      churchId,
      deletedAt: null,
    },
  });
  assertMemberBelongsToChurch(member, churchId);
  try {
    const row = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        memberId: member.id,
        relationship: input.relationship.trim(),
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            membershipNumber: true,
          },
        },
      },
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "family.member.add",
      entityType: "family",
      entityId: family.id,
      newData: { memberId: member.id },
    });
    return row;
  } catch (error) {
    throwIfUniqueConflict(error, "This member already belongs to a family");
  }
}

export async function addFamilyMembers(
  session: AuthContext,
  familyId: string,
  members: { memberId: string; relationship: string }[],
) {
  const uniqueIds = [...new Set(members.map((row) => row.memberId))];
  if (uniqueIds.length !== members.length) {
    throw new ValidationError("Duplicate members in this family assignment");
  }
  const rows = [];
  for (const row of members) {
    rows.push(await addFamilyMember(session, familyId, row));
  }
  return rows;
}

export async function removeFamilyMember(
  session: AuthContext,
  familyId: string,
  memberId: string,
) {
  requirePermission(session, "families:manage");
  const churchId = requireChurch(session);
  const family = await getFamily(session, familyId);
  const existing = await prisma.familyMember.findFirst({
    where: { familyId: family.id, memberId },
  });
  if (!existing) {
    throw new NotFoundError();
  }
  await prisma.familyMember.delete({ where: { id: existing.id } });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "family.member.remove",
    entityType: "family",
    entityId: family.id,
    oldData: { memberId },
  });
}
