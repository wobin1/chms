import "server-only";
import type { ChildStatus, MemberGender } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError, ValidationError } from "./errors";
import { prisma } from "./db";
import { assertMemberBelongsToChurch } from "./member-rules";
import { requirePermission } from "./permissions";
import { throwIfUniqueConflict } from "./prisma-errors";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const childInclude = {
  family: { select: { id: true, name: true } },
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
};

async function requireFamilyInChurch(churchId: string, familyId: string) {
  const family = await prisma.family.findFirst({
    where: tenantWhere(churchId, { id: familyId }),
    select: { id: true, churchId: true },
  });
  if (!family) {
    throw new NotFoundError();
  }
  return family;
}

async function requireMembersInChurch(
  churchId: string,
  memberIds: string[],
) {
  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length !== memberIds.length) {
    throw new ValidationError("Each guardian can be listed only once");
  }
  const members = [];
  for (const memberId of uniqueIds) {
    const member = await prisma.member.findFirst({
      where: { id: memberId, churchId, deletedAt: null },
    });
    assertMemberBelongsToChurch(member, churchId);
    members.push(member);
  }
  return members;
}

export async function listChildren(
  session: AuthContext,
  filters: ListFilters & { familyId?: string } = {},
) {
  requirePermission(session, "children:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = tenantWhere(churchId, {
    ...(filters.familyId ? { familyId: filters.familyId } : {}),
    ...(filters.q
      ? {
          OR: [
            { firstName: { contains: filters.q, mode: "insensitive" as const } },
            { lastName: { contains: filters.q, mode: "insensitive" as const } },
            { school: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  });
  const [items, total] = await Promise.all([
    prisma.child.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: childInclude,
      skip,
      take,
    }),
    prisma.child.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getChild(session: AuthContext, childId: string) {
  requirePermission(session, "children:read");
  const churchId = requireChurch(session);
  const child = await prisma.child.findFirst({
    where: tenantWhere(churchId, { id: childId }),
    include: childInclude,
  });
  if (!child) {
    throw new NotFoundError();
  }
  return child;
}

export async function createChild(
  session: AuthContext,
  input: {
    familyId: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gender?: MemberGender;
    dateOfBirth?: Date | null;
    school?: string | null;
    notes?: string | null;
    status?: ChildStatus;
    guardians?: { memberId: string; relationship: string }[];
  },
) {
  requirePermission(session, "children:manage");
  const churchId = requireChurch(session);
  const family = await requireFamilyInChurch(churchId, input.familyId);
  const guardians = input.guardians ?? [];
  if (guardians.length > 0) {
    await requireMembersInChurch(
      churchId,
      guardians.map((row) => row.memberId),
    );
  }

  const child = await prisma.child.create({
    data: {
      churchId,
      familyId: family.id,
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() || null,
      lastName: input.lastName.trim(),
      gender: input.gender ?? "UNSPECIFIED",
      dateOfBirth: input.dateOfBirth ?? null,
      school: input.school?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status ?? "ACTIVE",
      ...(guardians.length > 0
        ? {
            guardians: {
              create: guardians.map((row) => ({
                memberId: row.memberId,
                relationship: row.relationship.trim(),
              })),
            },
          }
        : {}),
    },
    include: childInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "child.create",
    entityType: "child",
    entityId: child.id,
    newData: { familyId: family.id },
  });
  return child;
}

export async function updateChild(
  session: AuthContext,
  childId: string,
  input: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    gender?: MemberGender;
    dateOfBirth?: Date | null;
    school?: string | null;
    notes?: string | null;
    status?: ChildStatus;
  },
) {
  requirePermission(session, "children:manage");
  const existing = await getChild(session, childId);
  const child = await prisma.child.update({
    where: { id: existing.id },
    data: {
      firstName: input.firstName?.trim(),
      middleName:
        input.middleName === undefined
          ? undefined
          : input.middleName?.trim() || null,
      lastName: input.lastName?.trim(),
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      school: input.school === undefined ? undefined : input.school?.trim() || null,
      notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
      status: input.status,
    },
    include: childInclude,
  });
  await writeAuditLog({
    churchId: existing.churchId,
    userId: session.userId,
    action: "child.update",
    entityType: "child",
    entityId: child.id,
  });
  return child;
}

export async function addChildGuardian(
  session: AuthContext,
  childId: string,
  input: { memberId: string; relationship: string },
) {
  requirePermission(session, "children:manage");
  const churchId = requireChurch(session);
  const child = await getChild(session, childId);
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, churchId, deletedAt: null },
  });
  assertMemberBelongsToChurch(member, churchId);
  try {
    const row = await prisma.childGuardian.create({
      data: {
        childId: child.id,
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
      action: "child.guardian.add",
      entityType: "child",
      entityId: child.id,
      newData: { memberId: member.id },
    });
    return row;
  } catch (error) {
    throwIfUniqueConflict(error, "This member is already a guardian of this child");
  }
}

export async function removeChildGuardian(
  session: AuthContext,
  childId: string,
  memberId: string,
) {
  requirePermission(session, "children:manage");
  const churchId = requireChurch(session);
  const child = await getChild(session, childId);
  const existing = await prisma.childGuardian.findFirst({
    where: { childId: child.id, memberId },
  });
  if (!existing) {
    throw new NotFoundError();
  }
  await prisma.childGuardian.delete({ where: { id: existing.id } });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "child.guardian.remove",
    entityType: "child",
    entityId: child.id,
    oldData: { memberId },
  });
}
