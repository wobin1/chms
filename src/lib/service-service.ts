import "server-only";
import type { Prisma, ServiceStatus } from "@prisma/client";
import { assertUniqueAttendanceCategories } from "./attendance-rules";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError, ValidationError } from "./errors";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { throwIfUniqueConflict } from "./prisma-errors";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const serviceInclude = {
  serviceType: { select: { id: true, name: true } },
  attendance: {
    include: { attendanceCategory: { select: { id: true, name: true, sortOrder: true } } },
    orderBy: { attendanceCategory: { sortOrder: "asc" as const } },
  },
  visits: {
    include: {
      visitor: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  _count: { select: { visits: true } },
} satisfies Prisma.ServiceInclude;

function requireServiceAccess(session: AuthContext) {
  if (
    !session.permissions.includes("services:read") &&
    !session.permissions.includes("attendance:manage")
  ) {
    requirePermission(session, "services:read");
  }
}

export async function listServiceTypes(
  session: AuthContext,
  filters: ListFilters = {},
) {
  requireServiceAccess(session);
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? { name: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.serviceType.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.serviceType.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createServiceType(
  session: AuthContext,
  input: { name: string },
) {
  requirePermission(session, "services:manage");
  const churchId = requireChurch(session);
  try {
    return await prisma.serviceType.create({
      data: { churchId, name: input.name.trim() },
    });
  } catch (error) {
    throwIfUniqueConflict(error, "A service type with that name already exists");
  }
}

export async function listAttendanceCategories(
  session: AuthContext,
  filters: ListFilters = {},
) {
  requireServiceAccess(session);
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? { name: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.attendanceCategory.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      skip,
      take,
    }),
    prisma.attendanceCategory.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createAttendanceCategory(
  session: AuthContext,
  input: { name: string; sortOrder?: number },
) {
  requirePermission(session, "services:manage");
  const churchId = requireChurch(session);
  try {
    return await prisma.attendanceCategory.create({
      data: {
        churchId,
        name: input.name.trim(),
        sortOrder: input.sortOrder ?? 0,
      },
    });
  } catch (error) {
    throwIfUniqueConflict(
      error,
      "An attendance category with that name already exists",
    );
  }
}

export async function listServices(session: AuthContext, filters: ListFilters = {}) {
  requireServiceAccess(session);
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" as const } },
            { preacher: { contains: filters.q, mode: "insensitive" as const } },
            { theme: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: { serviceDate: "desc" },
      include: serviceInclude,
      skip,
      take,
    }),
    prisma.service.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getService(session: AuthContext, serviceId: string) {
  requireServiceAccess(session);
  const churchId = requireChurch(session);
  const service = await prisma.service.findFirst({
    where: tenantWhere(churchId, { id: serviceId }),
    include: serviceInclude,
  });
  if (!service) {
    throw new NotFoundError();
  }
  return service;
}

export async function createService(
  session: AuthContext,
  input: {
    serviceTypeId: string;
    serviceDate: Date;
    name: string;
    theme?: string | null;
    scripture?: string | null;
    preacher?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    notes?: string | null;
    status?: ServiceStatus;
  },
) {
  requirePermission(session, "services:manage");
  const churchId = requireChurch(session);
  const serviceType = await prisma.serviceType.findFirst({
    where: tenantWhere(churchId, { id: input.serviceTypeId }),
  });
  if (!serviceType) {
    throw new NotFoundError();
  }
  const service = await prisma.service.create({
    data: {
      churchId,
      serviceTypeId: serviceType.id,
      serviceDate: input.serviceDate,
      name: input.name.trim(),
      theme: input.theme?.trim() || null,
      scripture: input.scripture?.trim() || null,
      preacher: input.preacher?.trim() || null,
      startTime: input.startTime?.trim() || null,
      endTime: input.endTime?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status ?? "SCHEDULED",
    },
    include: serviceInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "service.create",
    entityType: "service",
    entityId: service.id,
    newData: { name: service.name, serviceDate: service.serviceDate },
  });
  return service;
}

export async function updateService(
  session: AuthContext,
  serviceId: string,
  input: Partial<{
    serviceTypeId: string;
    serviceDate: Date;
    name: string;
    theme: string | null;
    scripture: string | null;
    preacher: string | null;
    startTime: string | null;
    endTime: string | null;
    notes: string | null;
    status: ServiceStatus;
  }>,
) {
  requirePermission(session, "services:manage");
  const existing = await getService(session, serviceId);
  if (input.serviceTypeId) {
    const serviceType = await prisma.serviceType.findFirst({
      where: tenantWhere(existing.churchId, { id: input.serviceTypeId }),
    });
    if (!serviceType) {
      throw new NotFoundError();
    }
  }
  const service = await prisma.service.update({
    where: { id: existing.id },
    data: {
      serviceTypeId: input.serviceTypeId,
      serviceDate: input.serviceDate,
      name: input.name?.trim(),
      theme: input.theme === undefined ? undefined : input.theme?.trim() || null,
      scripture:
        input.scripture === undefined ? undefined : input.scripture?.trim() || null,
      preacher:
        input.preacher === undefined ? undefined : input.preacher?.trim() || null,
      startTime:
        input.startTime === undefined ? undefined : input.startTime?.trim() || null,
      endTime: input.endTime === undefined ? undefined : input.endTime?.trim() || null,
      notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
      status: input.status,
    },
    include: serviceInclude,
  });
  await writeAuditLog({
    churchId: existing.churchId,
    userId: session.userId,
    action: "service.update",
    entityType: "service",
    entityId: service.id,
  });
  return service;
}

export async function saveServiceAttendance(
  session: AuthContext,
  serviceId: string,
  input: { items: { attendanceCategoryId: string; count: number }[] },
) {
  requirePermission(session, "attendance:manage");
  const churchId = requireChurch(session);
  const service = await getService(session, serviceId);
  assertUniqueAttendanceCategories(
    input.items.map((item) => item.attendanceCategoryId),
  );
  const categories = await prisma.attendanceCategory.findMany({
    where: {
      churchId,
      id: { in: input.items.map((item) => item.attendanceCategoryId) },
    },
  });
  if (categories.length !== input.items.length) {
    throw new ValidationError(
      "Attendance categories must belong to this church",
    );
  }
  await prisma.$transaction(
    input.items.map((item) =>
      prisma.serviceAttendance.upsert({
        where: {
          serviceId_attendanceCategoryId: {
            serviceId: service.id,
            attendanceCategoryId: item.attendanceCategoryId,
          },
        },
        create: {
          serviceId: service.id,
          attendanceCategoryId: item.attendanceCategoryId,
          count: item.count,
        },
        update: { count: item.count },
      }),
    ),
  );
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "service.attendance.save",
    entityType: "service",
    entityId: service.id,
    newData: {
      total: input.items.reduce((sum, item) => sum + item.count, 0),
    },
  });
  return getService(session, serviceId);
}
