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

const departmentInclude = {
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

export async function listDepartments(
  session: AuthContext,
  filters: ListFilters = {},
) {
  requirePermission(session, "departments:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? { name: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.department.findMany({
      where,
      orderBy: { name: "asc" },
      include: departmentInclude,
      skip,
      take,
    }),
    prisma.department.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getDepartment(session: AuthContext, departmentId: string) {
  requirePermission(session, "departments:read");
  const churchId = requireChurch(session);
  const department = await prisma.department.findFirst({
    where: tenantWhere(churchId, { id: departmentId }),
    include: departmentInclude,
  });
  if (!department) {
    throw new NotFoundError();
  }
  return department;
}

export async function createDepartment(
  session: AuthContext,
  input: { name: string; description?: string | null },
) {
  requirePermission(session, "departments:manage");
  const churchId = requireChurch(session);
  try {
    const department = await prisma.department.create({
      data: {
        churchId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      },
      include: departmentInclude,
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "department.create",
      entityType: "department",
      entityId: department.id,
      newData: { name: department.name },
    });
    return department;
  } catch (error) {
    throwIfUniqueConflict(error, "A department with that name already exists");
  }
}

export async function updateDepartment(
  session: AuthContext,
  departmentId: string,
  input: {
    name?: string;
    description?: string | null;
    status?: "ACTIVE" | "INACTIVE";
  },
) {
  requirePermission(session, "departments:manage");
  const existing = await getDepartment(session, departmentId);
  try {
    const department = await prisma.department.update({
      where: { id: existing.id },
      data: {
        name: input.name?.trim(),
        description:
          input.description === undefined
            ? undefined
            : input.description?.trim() || null,
        status: input.status,
      },
      include: departmentInclude,
    });
    await writeAuditLog({
      churchId: existing.churchId,
      userId: session.userId,
      action: "department.update",
      entityType: "department",
      entityId: department.id,
    });
    return department;
  } catch (error) {
    throwIfUniqueConflict(error, "A department with that name already exists");
  }
}

export async function assignDepartmentMember(
  session: AuthContext,
  departmentId: string,
  input: { memberId: string; role?: string },
) {
  requirePermission(session, "departments:manage");
  const churchId = requireChurch(session);
  const department = await getDepartment(session, departmentId);
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, churchId, deletedAt: null },
  });
  assertMemberBelongsToChurch(member, churchId);
  try {
    const row = await prisma.memberDepartment.create({
      data: {
        departmentId: department.id,
        memberId: member.id,
        role: input.role?.trim() || "Member",
      },
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "department.member.add",
      entityType: "department",
      entityId: department.id,
      newData: { memberId: member.id },
    });
    return row;
  } catch (error) {
    throwIfUniqueConflict(
      error,
      "This member is already assigned to this department",
    );
  }
}

export async function removeDepartmentMember(
  session: AuthContext,
  departmentId: string,
  memberId: string,
) {
  requirePermission(session, "departments:manage");
  const churchId = requireChurch(session);
  const department = await getDepartment(session, departmentId);
  const existing = await prisma.memberDepartment.findFirst({
    where: { departmentId: department.id, memberId },
  });
  if (!existing) {
    throw new NotFoundError();
  }
  await prisma.memberDepartment.delete({ where: { id: existing.id } });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "department.member.remove",
    entityType: "department",
    entityId: department.id,
    oldData: { memberId },
  });
}
