import "server-only";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { ConflictError, NotFoundError } from "./errors";
import { hashPassword } from "./password";
import {
  CHURCH_ADMIN_PERMISSIONS,
  CHURCH_PERMISSIONS,
  ACCOUNTANT_PERMISSIONS,
  DEFAULT_ATTENDANCE_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_GIVING_TYPES,
  DEFAULT_MEMBERSHIP_STATUSES,
  DEFAULT_SERVICE_TYPES,
  ZONE_LEADER_PERMISSIONS,
} from "./permission-catalog";
import { requirePermission } from "./permissions";
import { prisma } from "./db";
import { throwIfUniqueConflict } from "./prisma-errors";
import { requireChurch } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

export type CreateChurchInput = {
  name: string;
  slug: string;
  shortName?: string | null;
  denomination?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  admin: {
    name: string;
    email: string;
    password: string;
  };
};

export type UpdateChurchInput = {
  name?: string;
  slug?: string;
  shortName?: string | null;
  denomination?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  logo?: string | null;
};

const churchSelect = {
  id: true,
  name: true,
  slug: true,
  shortName: true,
  denomination: true,
  address: true,
  city: true,
  state: true,
  phone: true,
  email: true,
  logo: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChurchSelect;

export async function listChurches(session: AuthContext, filters: ListFilters = {}) {
  requirePermission(session, "churches:manage");
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const statusFilter =
    filters.status === "ACTIVE" || filters.status === "SUSPENDED"
      ? filters.status
      : undefined;
  const where: Prisma.ChurchWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" as const } },
            { slug: { contains: filters.q, mode: "insensitive" as const } },
            { city: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.church.findMany({
      where,
      orderBy: { name: "asc" },
      select: churchSelect,
      skip,
      take,
    }),
    prisma.church.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getChurchByIdForSession(
  session: AuthContext,
  churchId: string,
) {
  if (session.churchId) {
    if (session.churchId !== churchId) {
      throw new NotFoundError();
    }
    return getCurrentChurch(session);
  }
  requirePermission(session, "churches:manage");
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    select: churchSelect,
  });
  if (!church) {
    throw new NotFoundError();
  }
  return church;
}

export async function getCurrentChurch(session: AuthContext) {
  const churchId = requireChurch(session);
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    select: churchSelect,
  });
  if (!church) {
    throw new NotFoundError();
  }
  return church;
}

export async function createChurch(
  session: AuthContext,
  input: CreateChurchInput,
) {
  requirePermission(session, "churches:manage");
  const adminEmail = input.admin.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (existingUser) {
    throw new ConflictError("A user with that email already exists");
  }

  try {
    const church = await prisma.$transaction(async (tx) => {
      const created = await tx.church.create({
        data: {
          name: input.name,
          slug: input.slug,
          shortName: input.shortName,
          denomination: input.denomination,
          address: input.address,
          city: input.city,
          state: input.state,
          phone: input.phone,
          email: input.email,
          notes: input.notes,
        },
        select: churchSelect,
      });

      const permissions = await tx.permission.findMany({
        where: { name: { in: [...CHURCH_PERMISSIONS] } },
      });
      const permissionByName = new Map(
        permissions.map((row) => [row.name, row.id]),
      );

      const adminRole = await tx.role.create({
        data: {
          churchId: created.id,
          name: "Church Administrator",
          description: "Full administration of this church",
        },
      });
      const zoneLeaderRole = await tx.role.create({
        data: {
          churchId: created.id,
          name: "Zone Leader",
          description: "Members in assigned zones",
        },
      });
      const accountantRole = await tx.role.create({
        data: {
          churchId: created.id,
          name: "Accountant",
          description: "Giving, expenses, and financial records for this church",
        },
      });

      await tx.rolePermission.createMany({
        data: [
          ...CHURCH_ADMIN_PERMISSIONS.map((name) => ({
            roleId: adminRole.id,
            permissionId: permissionByName.get(name) ?? "",
          })),
          ...ZONE_LEADER_PERMISSIONS.map((name) => ({
            roleId: zoneLeaderRole.id,
            permissionId: permissionByName.get(name) ?? "",
          })),
          ...ACCOUNTANT_PERMISSIONS.map((name) => ({
            roleId: accountantRole.id,
            permissionId: permissionByName.get(name) ?? "",
          })),
        ].filter((row) => row.permissionId),
      });

      await tx.membershipStatus.createMany({
        data: DEFAULT_MEMBERSHIP_STATUSES.map((name, index) => ({
          churchId: created.id,
          name,
          sortOrder: index,
        })),
      });
      await tx.serviceType.createMany({
        data: DEFAULT_SERVICE_TYPES.map((name) => ({
          churchId: created.id,
          name,
        })),
      });
      await tx.attendanceCategory.createMany({
        data: DEFAULT_ATTENDANCE_CATEGORIES.map((name, index) => ({
          churchId: created.id,
          name,
          sortOrder: index,
        })),
      });
      await tx.givingType.createMany({
        data: DEFAULT_GIVING_TYPES.map((name) => ({
          churchId: created.id,
          name,
        })),
      });
      await tx.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
          churchId: created.id,
          name,
        })),
      });

      const admin = await tx.user.create({
        data: {
          churchId: created.id,
          name: input.admin.name,
          email: adminEmail,
          passwordHash: await hashPassword(input.admin.password),
        },
      });
      await tx.userRole.create({
        data: { userId: admin.id, roleId: adminRole.id },
      });

      return created;
    });

    await writeAuditLog({
      churchId: church.id,
      userId: session.userId,
      action: "church.create",
      entityType: "church",
      entityId: church.id,
      newData: { name: church.name, slug: church.slug },
    });

    return church;
  } catch (error) {
    throwIfUniqueConflict(error, "A church with that slug already exists");
  }
}

export async function updateChurchAsPlatform(
  session: AuthContext,
  churchId: string,
  input: UpdateChurchInput,
) {
  requirePermission(session, "churches:manage");
  const existing = await prisma.church.findUnique({ where: { id: churchId } });
  if (!existing) {
    throw new NotFoundError();
  }
  try {
    const updated = await prisma.church.update({
      where: { id: churchId },
      data: input,
      select: churchSelect,
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "church.update",
      entityType: "church",
      entityId: churchId,
    });
    return updated;
  } catch (error) {
    throwIfUniqueConflict(error, "A church with that slug already exists");
  }
}

export async function updateCurrentChurch(
  session: AuthContext,
  input: UpdateChurchInput,
) {
  requirePermission(session, "church:update");
  const churchId = requireChurch(session);
  const updated = await prisma.church.update({
    where: { id: churchId },
    data: {
      name: input.name,
      shortName: input.shortName,
      denomination: input.denomination,
      address: input.address,
      city: input.city,
      state: input.state,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
      logo: input.logo,
    },
    select: churchSelect,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "church.update",
    entityType: "church",
    entityId: churchId,
  });
  return updated;
}

export async function setChurchStatus(
  session: AuthContext,
  churchId: string,
  status: "ACTIVE" | "SUSPENDED",
) {
  requirePermission(session, "churches:manage");
  const existing = await prisma.church.findUnique({ where: { id: churchId } });
  if (!existing) {
    throw new NotFoundError();
  }
  const updated = await prisma.church.update({
    where: { id: churchId },
    data: { status },
    select: churchSelect,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: status === "SUSPENDED" ? "church.suspend" : "church.reactivate",
    entityType: "church",
    entityId: churchId,
    oldData: { status: existing.status },
    newData: { status },
  });
  return updated;
}
