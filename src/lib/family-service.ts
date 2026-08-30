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

const familyInclude = {
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

export async function listFamilies(session: AuthContext, filters: ListFilters = {}) {
  requirePermission(session, "families:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
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
  return { items, total, page, pageSize };
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
  return family;
}

export async function createFamily(
  session: AuthContext,
  input: { name: string; address?: string | null },
) {
  requirePermission(session, "families:manage");
  const churchId = requireChurch(session);
  try {
    const family = await prisma.family.create({
      data: {
        churchId,
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
      newData: { name: family.name },
    });
    return family;
  } catch (error) {
    throwIfUniqueConflict(error, "A family with that name already exists");
  }
}

export async function updateFamily(
  session: AuthContext,
  familyId: string,
  input: { name?: string; address?: string | null },
) {
  requirePermission(session, "families:manage");
  const existing = await getFamily(session, familyId);
  try {
    const family = await prisma.family.update({
      where: { id: existing.id },
      data: {
        name: input.name?.trim(),
        address:
          input.address === undefined ? undefined : input.address?.trim() || null,
      },
      include: familyInclude,
    });
    await writeAuditLog({
      churchId: existing.churchId,
      userId: session.userId,
      action: "family.update",
      entityType: "family",
      entityId: family.id,
    });
    return family;
  } catch (error) {
    throwIfUniqueConflict(error, "A family with that name already exists");
  }
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
