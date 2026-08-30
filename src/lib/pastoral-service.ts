import "server-only";
import type { PastoralCasePriority, PastoralCaseStatus } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError } from "./errors";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { requireChurch } from "./tenant";
import { listAssignedZoneIds } from "./zone-service";
import { type ListFilters, resolvePagination } from "./pagination";

const caseInclude = {
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      membershipNumber: true,
      zoneId: true,
      zone: { select: { id: true, name: true } },
    },
  },
  assignedTo: { select: { id: true, name: true } },
} as const;

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isPastoralZoneScoped(session: AuthContext) {
  return (
    session.permissions.includes("pastoral:read") &&
    !session.permissions.includes("pastoral:manage") &&
    !session.permissions.includes("members:manage")
  );
}

async function pastoralMemberFilter(session: AuthContext, churchId: string) {
  if (!isPastoralZoneScoped(session)) {
    return { deletedAt: null };
  }
  const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
  return { deletedAt: null, zoneId: { in: assignedZoneIds } };
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

export async function listPastoralCases(
  session: AuthContext,
  filters: ListFilters = {},
) {
  requirePermission(session, "pastoral:read");
  const churchId = requireChurch(session);
  const member = await pastoralMemberFilter(session, churchId);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    churchId,
    member,
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" as const } },
            { summary: { contains: filters.q, mode: "insensitive" as const } },
            {
              member: {
                OR: [
                  { firstName: { contains: filters.q, mode: "insensitive" as const } },
                  { lastName: { contains: filters.q, mode: "insensitive" as const } },
                ],
              },
            },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.pastoralCase.findMany({
      where,
      orderBy: { openedAt: "desc" },
      include: caseInclude,
      skip,
      take,
    }),
    prisma.pastoralCase.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getPastoralCase(session: AuthContext, caseId: string) {
  requirePermission(session, "pastoral:read");
  const churchId = requireChurch(session);
  const member = await pastoralMemberFilter(session, churchId);
  const row = await prisma.pastoralCase.findFirst({
    where: { id: caseId, churchId, member },
    include: caseInclude,
  });
  if (!row) {
    throw new NotFoundError();
  }
  return row;
}

export async function createPastoralCase(
  session: AuthContext,
  input: {
    memberId: string;
    caseType: string;
    title: string;
    description?: string | null;
    notes?: string | null;
    priority?: PastoralCasePriority;
    status?: PastoralCaseStatus;
    assignedToId?: string | null;
  },
) {
  requirePermission(session, "pastoral:manage");
  const churchId = requireChurch(session);
  const member = await prisma.member.findFirst({
    where: { id: input.memberId, churchId, deletedAt: null },
  });
  if (!member) {
    throw new NotFoundError();
  }
  const assignedToId = await requireAssigneeInChurch(
    churchId,
    input.assignedToId,
  );
  const status = input.status ?? "OPEN";
  const row = await prisma.pastoralCase.create({
    data: {
      churchId,
      memberId: member.id,
      caseType: input.caseType.trim(),
      title: input.title.trim(),
      description: emptyToNull(input.description),
      notes: emptyToNull(input.notes),
      priority: input.priority ?? "MEDIUM",
      status,
      assignedToId,
      closedAt: status === "CLOSED" ? new Date() : null,
    },
    include: caseInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "pastoral_case.create",
    entityType: "pastoral_case",
    entityId: row.id,
    newData: { title: row.title, caseType: row.caseType },
  });
  return row;
}

export async function updatePastoralCase(
  session: AuthContext,
  caseId: string,
  input: {
    memberId?: string;
    caseType?: string;
    title?: string;
    description?: string | null;
    notes?: string | null;
    priority?: PastoralCasePriority;
    status?: PastoralCaseStatus;
    assignedToId?: string | null;
  },
) {
  requirePermission(session, "pastoral:manage");
  const existing = await getPastoralCase(session, caseId);
  let memberId = existing.memberId;
  if (input.memberId) {
    const member = await prisma.member.findFirst({
      where: { id: input.memberId, churchId: existing.churchId, deletedAt: null },
    });
    if (!member) {
      throw new NotFoundError();
    }
    memberId = member.id;
  }
  const assignedToId =
    input.assignedToId === undefined
      ? undefined
      : await requireAssigneeInChurch(existing.churchId, input.assignedToId);
  const status = input.status ?? existing.status;
  const row = await prisma.pastoralCase.update({
    where: { id: existing.id },
    data: {
      memberId,
      caseType: input.caseType?.trim(),
      title: input.title?.trim(),
      description:
        input.description === undefined
          ? undefined
          : emptyToNull(input.description),
      notes: input.notes === undefined ? undefined : emptyToNull(input.notes),
      priority: input.priority,
      status: input.status,
      assignedToId,
      closedAt:
        input.status === undefined
          ? undefined
          : status === "CLOSED"
            ? existing.closedAt ?? new Date()
            : null,
    },
    include: caseInclude,
  });
  await writeAuditLog({
    churchId: existing.churchId,
    userId: session.userId,
    action: "pastoral_case.update",
    entityType: "pastoral_case",
    entityId: row.id,
    newData: { title: row.title, status: row.status },
  });
  return row;
}
