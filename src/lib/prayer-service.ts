import "server-only";
import type { PrayerRequestStatus } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError } from "./errors";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const requestInclude = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      membershipNumber: true,
    },
  },
  assignedTo: { select: { id: true, name: true } },
} as const;

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function completedAtFor(status: PrayerRequestStatus, existing?: Date | null) {
  if (status === "ANSWERED" || status === "CLOSED") {
    return existing ?? new Date();
  }
  return null;
}

async function requireAssigneeInChurch(
  churchId: string,
  assignedToId?: string | null,
) {
  if (!assignedToId) return null;
  const user = await prisma.user.findFirst({
    where: { id: assignedToId, churchId, status: "ACTIVE" },
  });
  if (!user) {
    throw new NotFoundError();
  }
  return user.id;
}

export async function listPrayerRequests(
  session: AuthContext,
  filters: ListFilters = {},
) {
  requirePermission(session, "prayer:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" as const } },
            { description: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.prayerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: requestInclude,
      skip,
      take,
    }),
    prisma.prayerRequest.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getPrayerRequest(
  session: AuthContext,
  requestId: string,
) {
  requirePermission(session, "prayer:read");
  const churchId = requireChurch(session);
  const row = await prisma.prayerRequest.findFirst({
    where: tenantWhere(churchId, { id: requestId }),
    include: requestInclude,
  });
  if (!row) {
    throw new NotFoundError();
  }
  return row;
}

export async function createPrayerRequest(
  session: AuthContext,
  input: {
    title: string;
    description?: string | null;
    memberId?: string | null;
    status?: PrayerRequestStatus;
    assignedToId?: string | null;
  },
) {
  requirePermission(session, "prayer:manage");
  const churchId = requireChurch(session);
  let memberId: string | null = null;
  if (input.memberId) {
    const member = await prisma.member.findFirst({
      where: { id: input.memberId, churchId, deletedAt: null },
    });
    if (!member) {
      throw new NotFoundError();
    }
    memberId = member.id;
  }
  const assignedToId = await requireAssigneeInChurch(
    churchId,
    input.assignedToId,
  );
  const status = input.status ?? "OPEN";
  const row = await prisma.prayerRequest.create({
    data: {
      churchId,
      memberId,
      title: input.title.trim(),
      description: emptyToNull(input.description),
      status,
      assignedToId,
      completedAt: completedAtFor(status),
    },
    include: requestInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "prayer_request.create",
    entityType: "prayer_request",
    entityId: row.id,
    newData: { title: row.title },
  });
  return row;
}

export async function updatePrayerRequest(
  session: AuthContext,
  requestId: string,
  input: {
    title?: string;
    description?: string | null;
    memberId?: string | null;
    status?: PrayerRequestStatus;
    assignedToId?: string | null;
  },
) {
  requirePermission(session, "prayer:manage");
  const existing = await getPrayerRequest(session, requestId);
  let memberId = existing.memberId;
  if (input.memberId !== undefined) {
    if (!input.memberId) {
      memberId = null;
    } else {
      const member = await prisma.member.findFirst({
        where: {
          id: input.memberId,
          churchId: existing.churchId,
          deletedAt: null,
        },
      });
      if (!member) {
        throw new NotFoundError();
      }
      memberId = member.id;
    }
  }
  const assignedToId =
    input.assignedToId === undefined
      ? undefined
      : await requireAssigneeInChurch(existing.churchId, input.assignedToId);
  const status = input.status ?? existing.status;
  const row = await prisma.prayerRequest.update({
    where: { id: existing.id },
    data: {
      title: input.title?.trim(),
      description:
        input.description === undefined
          ? undefined
          : emptyToNull(input.description),
      memberId,
      status: input.status,
      assignedToId,
      completedAt:
        input.status === undefined
          ? undefined
          : completedAtFor(status, existing.completedAt),
    },
    include: requestInclude,
  });
  await writeAuditLog({
    churchId: existing.churchId,
    userId: session.userId,
    action: "prayer_request.update",
    entityType: "prayer_request",
    entityId: row.id,
    newData: { title: row.title, status: row.status },
  });
  return row;
}
