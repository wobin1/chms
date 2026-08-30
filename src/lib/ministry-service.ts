import "server-only";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError } from "./errors";
import { prisma } from "./db";
import { assertMemberBelongsToChurch } from "./member-rules";
import { requirePermission } from "./permissions";
import { throwIfUniqueConflict } from "./prisma-errors";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const ministryInclude = {
  members: {
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          membershipNumber: true,
          zone: { select: { name: true } },
        },
      },
    },
    orderBy: { member: { lastName: "asc" as const } },
  },
  _count: { select: { members: true } },
};

export async function listMinistries(
  session: AuthContext,
  filters: ListFilters = {},
) {
  requirePermission(session, "ministries:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? { name: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.ministry.findMany({
      where,
      orderBy: { name: "asc" },
      include: ministryInclude,
      skip,
      take,
    }),
    prisma.ministry.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getMinistry(session: AuthContext, ministryId: string) {
  requirePermission(session, "ministries:read");
  const churchId = requireChurch(session);
  const ministry = await prisma.ministry.findFirst({
    where: tenantWhere(churchId, { id: ministryId }),
    include: ministryInclude,
  });
  if (!ministry) {
    throw new NotFoundError();
  }
  return ministry;
}

export async function createMinistry(
  session: AuthContext,
  input: { name: string; description?: string | null },
) {
  requirePermission(session, "ministries:manage");
  const churchId = requireChurch(session);
  try {
    const ministry = await prisma.ministry.create({
      data: {
        churchId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      },
      include: ministryInclude,
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "ministry.create",
      entityType: "ministry",
      entityId: ministry.id,
      newData: { name: ministry.name },
    });
    return ministry;
  } catch (error) {
    throwIfUniqueConflict(error, "A ministry with that name already exists");
  }
}

export async function updateMinistry(
  session: AuthContext,
  ministryId: string,
  input: {
    name?: string;
    description?: string | null;
    status?: "ACTIVE" | "INACTIVE";
  },
) {
  requirePermission(session, "ministries:manage");
  const existing = await getMinistry(session, ministryId);
  try {
    const ministry = await prisma.ministry.update({
      where: { id: existing.id },
      data: {
        name: input.name?.trim(),
        description:
          input.description === undefined
            ? undefined
            : input.description?.trim() || null,
        status: input.status,
      },
      include: ministryInclude,
    });
    await writeAuditLog({
      churchId: existing.churchId,
      userId: session.userId,
      action: "ministry.update",
      entityType: "ministry",
      entityId: ministry.id,
    });
    return ministry;
  } catch (error) {
    throwIfUniqueConflict(error, "A ministry with that name already exists");
  }
}

export async function assignMinistryMember(
  session: AuthContext,
  ministryId: string,
  input: { memberId: string; role?: string },
) {
  requirePermission(session, "ministries:manage");
  const churchId = requireChurch(session);
  const ministry = await getMinistry(session, ministryId);
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, churchId, deletedAt: null },
  });
  assertMemberBelongsToChurch(member, churchId);
  try {
    const row = await prisma.memberMinistry.create({
      data: {
        ministryId: ministry.id,
        memberId: member.id,
        role: input.role?.trim() || "Member",
      },
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "ministry.member.add",
      entityType: "ministry",
      entityId: ministry.id,
      newData: { memberId: member.id },
    });
    return row;
  } catch (error) {
    throwIfUniqueConflict(
      error,
      "This member is already assigned to this ministry",
    );
  }
}

export async function removeMinistryMember(
  session: AuthContext,
  ministryId: string,
  memberId: string,
) {
  requirePermission(session, "ministries:manage");
  const churchId = requireChurch(session);
  const ministry = await getMinistry(session, ministryId);
  const existing = await prisma.memberMinistry.findFirst({
    where: { ministryId: ministry.id, memberId },
  });
  if (!existing) {
    throw new NotFoundError();
  }
  await prisma.memberMinistry.delete({ where: { id: existing.id } });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "ministry.member.remove",
    entityType: "ministry",
    entityId: ministry.id,
    oldData: { memberId },
  });
}
