import "server-only";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError } from "./errors";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { throwIfUniqueConflict } from "./prisma-errors";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const zoneInclude = {
  _count: { select: { members: true, leaders: true } },
  leaders: {
    where: { status: "ACTIVE" as const },
    include: { user: { select: { id: true, name: true, email: true } } },
  },
};

export async function listZones(session: AuthContext, filters: ListFilters = {}) {
  requirePermission(session, "zones:read");
  const churchId = requireChurch(session);
  const assignedZoneIds = session.permissions.includes("zones:manage")
    ? undefined
    : await listAssignedZoneIds(session.userId, churchId);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(assignedZoneIds ? { id: { in: assignedZoneIds } } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" as const } },
            { description: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.zone.findMany({
      where,
      orderBy: { name: "asc" },
      include: zoneInclude,
      skip,
      take,
    }),
    prisma.zone.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getZone(session: AuthContext, zoneId: string) {
  requirePermission(session, "zones:read");
  const churchId = requireChurch(session);
  const zone = await prisma.zone.findFirst({
    where: tenantWhere(churchId, { id: zoneId }),
    include: zoneInclude,
  });
  if (!zone) {
    throw new NotFoundError();
  }
  if (!session.permissions.includes("zones:manage")) {
    const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
    if (!assignedZoneIds.includes(zoneId)) {
      throw new NotFoundError();
    }
  }
  return zone;
}

export async function createZone(
  session: AuthContext,
  input: { name: string; description?: string | null },
) {
  requirePermission(session, "zones:manage");
  const churchId = requireChurch(session);
  try {
    const zone = await prisma.zone.create({
      data: {
        churchId,
        name: input.name.trim(),
        description: input.description,
      },
      include: zoneInclude,
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "zone.create",
      entityType: "zone",
      entityId: zone.id,
      newData: { name: zone.name },
    });
    return zone;
  } catch (error) {
    throwIfUniqueConflict(error, "A zone with that name already exists");
  }
}

export async function updateZone(
  session: AuthContext,
  zoneId: string,
  input: { name?: string; description?: string | null; status?: "ACTIVE" | "INACTIVE" },
) {
  requirePermission(session, "zones:manage");
  const churchId = requireChurch(session);
  const existing = await prisma.zone.findFirst({
    where: tenantWhere(churchId, { id: zoneId }),
  });
  if (!existing) {
    throw new NotFoundError();
  }
  try {
    const zone = await prisma.zone.update({
      where: { id: zoneId },
      data: {
        name: input.name?.trim(),
        description: input.description,
        status: input.status,
      },
      include: zoneInclude,
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: input.status === "INACTIVE" ? "zone.deactivate" : "zone.update",
      entityType: "zone",
      entityId: zone.id,
    });
    return zone;
  } catch (error) {
    throwIfUniqueConflict(error, "A zone with that name already exists");
  }
}

export async function assignZoneLeader(
  session: AuthContext,
  zoneId: string,
  userId: string,
) {
  requirePermission(session, "zones:manage");
  const churchId = requireChurch(session);
  const zone = await prisma.zone.findFirst({
    where: tenantWhere(churchId, { id: zoneId }),
  });
  if (!zone) {
    throw new NotFoundError();
  }
  const user = await prisma.user.findFirst({
    where: { id: userId, churchId },
  });
  if (!user) {
    throw new NotFoundError();
  }
  const leader = await prisma.zoneLeader.upsert({
    where: { zoneId_userId: { zoneId, userId } },
    update: { status: "ACTIVE" },
    create: { zoneId, userId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "zone.leader.assign",
    entityType: "zone",
    entityId: zoneId,
    newData: { leaderUserId: userId },
  });
  return leader;
}

export async function removeZoneLeader(
  session: AuthContext,
  zoneId: string,
  userId: string,
) {
  requirePermission(session, "zones:manage");
  const churchId = requireChurch(session);
  const zone = await prisma.zone.findFirst({
    where: tenantWhere(churchId, { id: zoneId }),
  });
  if (!zone) {
    throw new NotFoundError();
  }
  const existing = await prisma.zoneLeader.findUnique({
    where: { zoneId_userId: { zoneId, userId } },
  });
  if (!existing) {
    throw new NotFoundError();
  }
  await prisma.zoneLeader.update({
    where: { id: existing.id },
    data: { status: "INACTIVE" },
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "zone.leader.remove",
    entityType: "zone",
    entityId: zoneId,
    oldData: { leaderUserId: userId },
  });
}

export async function listAssignedZoneIds(userId: string, churchId: string) {
  const rows = await prisma.zoneLeader.findMany({
    where: {
      userId,
      status: "ACTIVE",
      zone: { churchId, status: "ACTIVE" },
    },
    select: { zoneId: true },
  });
  return rows.map((row) => row.zoneId);
}
