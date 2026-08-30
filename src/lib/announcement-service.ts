import "server-only";
import type { AnnouncementStatus } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError, ValidationError } from "./errors";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const announcementInclude = {
  createdBy: { select: { id: true, name: true } },
} as const;

function assertDateRange(startDate: Date, endDate: Date) {
  if (endDate.getTime() < startDate.getTime()) {
    throw new ValidationError("End date cannot be before start date");
  }
}

export async function listAnnouncements(
  session: AuthContext,
  filters: ListFilters = {},
) {
  requirePermission(session, "announcements:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" as const } },
            { body: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: announcementInclude,
      skip,
      take,
    }),
    prisma.announcement.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getAnnouncement(
  session: AuthContext,
  announcementId: string,
) {
  requirePermission(session, "announcements:read");
  const churchId = requireChurch(session);
  const announcement = await prisma.announcement.findFirst({
    where: tenantWhere(churchId, { id: announcementId }),
    include: announcementInclude,
  });
  if (!announcement) {
    throw new NotFoundError();
  }
  return announcement;
}

export async function createAnnouncement(
  session: AuthContext,
  input: {
    title: string;
    content: string;
    startDate: Date;
    endDate: Date;
    status?: AnnouncementStatus;
  },
) {
  requirePermission(session, "announcements:manage");
  const churchId = requireChurch(session);
  assertDateRange(input.startDate, input.endDate);
  const announcement = await prisma.announcement.create({
    data: {
      churchId,
      title: input.title.trim(),
      content: input.content.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? "PUBLISHED",
      createdById: session.userId,
    },
    include: announcementInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "announcement.create",
    entityType: "announcement",
    entityId: announcement.id,
    newData: { title: announcement.title },
  });
  return announcement;
}

export async function updateAnnouncement(
  session: AuthContext,
  announcementId: string,
  input: {
    title?: string;
    content?: string;
    startDate?: Date;
    endDate?: Date;
    status?: AnnouncementStatus;
  },
) {
  requirePermission(session, "announcements:manage");
  const existing = await getAnnouncement(session, announcementId);
  const startDate = input.startDate ?? existing.startDate;
  const endDate = input.endDate ?? existing.endDate;
  assertDateRange(startDate, endDate);
  const announcement = await prisma.announcement.update({
    where: { id: existing.id },
    data: {
      title: input.title?.trim(),
      content: input.content?.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status,
    },
    include: announcementInclude,
  });
  await writeAuditLog({
    churchId: existing.churchId,
    userId: session.userId,
    action: "announcement.update",
    entityType: "announcement",
    entityId: announcement.id,
  });
  return announcement;
}
