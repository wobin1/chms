import "server-only";
import type { UserStatus } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { prisma } from "./db";
import { hashPassword } from "./password";
import { CHURCH_PERMISSIONS } from "./permission-catalog";
import { requirePermission } from "./permissions";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const userSelect = {
  id: true,
  churchId: true,
  name: true,
  email: true,
  status: true,
  memberId: true,
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      membershipNumber: true,
    },
  },
  userRoles: { select: { role: { select: { id: true, name: true } } } },
} as const;

async function assertMemberOfChurch(churchId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: tenantWhere(churchId, { id: memberId, deletedAt: null }),
    select: { id: true },
  });
  if (!member) {
    throw new NotFoundError();
  }
  return member;
}

export async function listChurchUsers(
  session: AuthContext,
  filters: ListFilters = {},
) {
  requirePermission(session, "users:manage");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    churchId,
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" as const } },
            { email: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: userSelect,
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getChurchUser(session: AuthContext, userId: string) {
  requirePermission(session, "users:manage");
  const churchId = requireChurch(session);
  const user = await prisma.user.findFirst({
    where: { id: userId, churchId },
    select: userSelect,
  });
  if (!user) {
    throw new NotFoundError();
  }
  return user;
}

export async function createChurchUser(
  session: AuthContext,
  input: {
    name: string;
    email: string;
    password: string;
    roleName: string;
    memberId?: string | null;
  },
) {
  requirePermission(session, "users:manage");
  const churchId = requireChurch(session);
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("A user with that email already exists");
  }
  const role = await prisma.role.findFirst({
    where: { churchId, name: input.roleName },
  });
  if (!role) {
    throw new ValidationError("That role is not available in this church");
  }
  let memberId: string | null = null;
  if (input.memberId) {
    const member = await assertMemberOfChurch(churchId, input.memberId);
    const taken = await prisma.user.findFirst({
      where: { memberId: member.id },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictError("That member already has a user account");
    }
    memberId = member.id;
  }
  const user = await prisma.user.create({
    data: {
      churchId,
      name: input.name,
      email,
      passwordHash: await hashPassword(input.password),
      memberId,
      userRoles: { create: { roleId: role.id } },
    },
    select: userSelect,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "user.create",
    entityType: "user",
    entityId: user.id,
    newData: { roleName: input.roleName },
  });
  return user;
}

export async function updateChurchUser(
  session: AuthContext,
  userId: string,
  input: {
    name?: string;
    roleName?: string;
    memberId?: string | null;
    status?: UserStatus;
  },
) {
  requirePermission(session, "users:manage");
  const churchId = requireChurch(session);
  const existing = await getChurchUser(session, userId);
  if (input.status === "DISABLED" && existing.id === session.userId) {
    throw new ValidationError("You cannot disable your own account");
  }
  let memberId = input.memberId;
  if (input.memberId) {
    const member = await assertMemberOfChurch(churchId, input.memberId);
    const taken = await prisma.user.findFirst({
      where: { memberId: member.id, id: { not: existing.id } },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictError("That member already has a user account");
    }
    memberId = member.id;
  }
  if (input.roleName) {
    const role = await prisma.role.findFirst({
      where: { churchId, name: input.roleName },
    });
    if (!role) {
      throw new ValidationError("That role is not available in this church");
    }
    await prisma.userRole.deleteMany({ where: { userId: existing.id } });
    await prisma.userRole.create({
      data: { userId: existing.id, roleId: role.id },
    });
  }
  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: input.name?.trim(),
      status: input.status,
      memberId: memberId === undefined ? undefined : memberId,
    },
    select: userSelect,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "user.update",
    entityType: "user",
    entityId: user.id,
  });
  return user;
}

export async function listChurchRoles(session: AuthContext) {
  requirePermission(session, "users:manage");
  const churchId = requireChurch(session);
  return prisma.role.findMany({
    where: { churchId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { userRoles: true } },
    },
  });
}

export async function getChurchRole(session: AuthContext, roleId: string) {
  requirePermission(session, "users:manage");
  const churchId = requireChurch(session);
  const role = await prisma.role.findFirst({
    where: { id: roleId, churchId },
    include: {
      rolePermissions: {
        include: { permission: { select: { name: true } } },
      },
    },
  });
  if (!role) {
    throw new NotFoundError();
  }
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.rolePermissions.map((row) => row.permission.name),
  };
}

export async function updateChurchRolePermissions(
  session: AuthContext,
  roleId: string,
  permissionNames: string[],
) {
  requirePermission(session, "users:manage");
  const role = await getChurchRole(session, roleId);
  const uniqueNames = [...new Set(permissionNames)];
  const disallowed = uniqueNames.filter(
    (name) =>
      !(CHURCH_PERMISSIONS as readonly string[]).includes(name),
  );
  if (disallowed.length > 0) {
    throw new ValidationError("Only permissions for this church can be assigned");
  }
  const permissions = await prisma.permission.findMany({
    where: { name: { in: uniqueNames } },
    select: { id: true, name: true },
  });
  if (permissions.length !== uniqueNames.length) {
    throw new ValidationError("One or more permissions are not valid");
  }
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
    }),
  ]);
  await writeAuditLog({
    churchId: session.churchId,
    userId: session.userId,
    action: "role.permissions.update",
    entityType: "role",
    entityId: role.id,
  });
  return getChurchRole(session, roleId);
}

export async function listChurchPermissionCatalog(session: AuthContext) {
  requirePermission(session, "users:manage");
  requireChurch(session);
  return CHURCH_PERMISSIONS.map((name) => ({ name }));
}
