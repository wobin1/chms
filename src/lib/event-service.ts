import "server-only";
import type { EventStatus } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError, ValidationError } from "./errors";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const eventInclude = {
  attendance: true,
} as const;

function assertDateRange(startDate: Date, endDate: Date) {
  if (endDate.getTime() < startDate.getTime()) {
    throw new ValidationError("End date cannot be before start date");
  }
}

export async function listEvents(session: AuthContext, filters: ListFilters = {}) {
  requirePermission(session, "events:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: "insensitive" as const } },
            { eventType: { contains: filters.q, mode: "insensitive" as const } },
            { location: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: eventInclude,
      skip,
      take,
    }),
    prisma.event.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getEvent(session: AuthContext, eventId: string) {
  requirePermission(session, "events:read");
  const churchId = requireChurch(session);
  const event = await prisma.event.findFirst({
    where: tenantWhere(churchId, { id: eventId }),
    include: eventInclude,
  });
  if (!event) {
    throw new NotFoundError();
  }
  return event;
}

export async function createEvent(
  session: AuthContext,
  input: {
    name: string;
    description?: string | null;
    eventType: string;
    startDate: Date;
    endDate: Date;
    location: string;
    status?: EventStatus;
  },
) {
  requirePermission(session, "events:manage");
  const churchId = requireChurch(session);
  assertDateRange(input.startDate, input.endDate);
  const event = await prisma.event.create({
    data: {
      churchId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      eventType: input.eventType.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      location: input.location.trim(),
      status: input.status ?? "SCHEDULED",
    },
    include: eventInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "event.create",
    entityType: "event",
    entityId: event.id,
    newData: { name: event.name },
  });
  return event;
}

export async function updateEvent(
  session: AuthContext,
  eventId: string,
  input: {
    name?: string;
    description?: string | null;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    location?: string;
    status?: EventStatus;
  },
) {
  requirePermission(session, "events:manage");
  const existing = await getEvent(session, eventId);
  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate ?? existing.endDate;
  assertDateRange(startDate, endDate);
  const event = await prisma.event.update({
    where: { id: existing.id },
    data: {
      name: input.name?.trim(),
      description:
        input.description === undefined
          ? undefined
          : input.description?.trim() || null,
      eventType: input.eventType?.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      location: input.location?.trim(),
      status: input.status,
    },
    include: eventInclude,
  });
  await writeAuditLog({
    churchId: existing.churchId,
    userId: session.userId,
    action: "event.update",
    entityType: "event",
    entityId: event.id,
  });
  return event;
}

export async function saveEventAttendance(
  session: AuthContext,
  eventId: string,
  input: { attendanceCount: number },
) {
  requirePermission(session, "events:manage");
  const event = await getEvent(session, eventId);
  if (!Number.isInteger(input.attendanceCount) || input.attendanceCount < 0) {
    throw new ValidationError("Attendance count must be zero or greater");
  }
  await prisma.eventAttendance.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      attendanceCount: input.attendanceCount,
    },
    update: { attendanceCount: input.attendanceCount },
  });
  await writeAuditLog({
    churchId: event.churchId,
    userId: session.userId,
    action: "event.attendance.save",
    entityType: "event",
    entityId: event.id,
    newData: { attendanceCount: input.attendanceCount },
  });
  return getEvent(session, event.id);
}
