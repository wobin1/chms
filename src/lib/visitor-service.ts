import "server-only";
import type { MemberGender, VisitFollowUpStatus, VisitorStatus } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { ConflictError, NotFoundError } from "./errors";
import { prisma } from "./db";
import { createMember } from "./member-service";
import { requirePermission } from "./permissions";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const visitorInclude = {
  visits: {
    include: {
      service: { select: { id: true, name: true, serviceDate: true } },
    },
    orderBy: { visitDate: "desc" as const },
  },
  convertedMember: {
    select: { id: true, membershipNumber: true, firstName: true, lastName: true },
  },
};

export async function listVisitors(session: AuthContext, filters: ListFilters = {}) {
  requirePermission(session, "visitors:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? {
          OR: [
            { firstName: { contains: filters.q, mode: "insensitive" as const } },
            { lastName: { contains: filters.q, mode: "insensitive" as const } },
            { phone: { contains: filters.q, mode: "insensitive" as const } },
            { email: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.visitor.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: visitorInclude,
      skip,
      take,
    }),
    prisma.visitor.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getVisitor(session: AuthContext, visitorId: string) {
  requirePermission(session, "visitors:read");
  const churchId = requireChurch(session);
  const visitor = await prisma.visitor.findFirst({
    where: tenantWhere(churchId, { id: visitorId }),
    include: visitorInclude,
  });
  if (!visitor) {
    throw new NotFoundError();
  }
  return visitor;
}

export async function createVisitor(
  session: AuthContext,
  input: {
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
    gender?: MemberGender;
    address?: string | null;
    howHeard?: string | null;
    firstVisitDate?: Date | null;
    status?: VisitorStatus;
    notes?: string | null;
  },
) {
  requirePermission(session, "visitors:manage");
  const churchId = requireChurch(session);
  const visitor = await prisma.visitor.create({
    data: {
      churchId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      gender: input.gender ?? "UNSPECIFIED",
      address: input.address?.trim() || null,
      howHeard: input.howHeard?.trim() || null,
      firstVisitDate: input.firstVisitDate,
      status: input.status ?? "NEW",
      notes: input.notes?.trim() || null,
    },
    include: visitorInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "visitor.create",
    entityType: "visitor",
    entityId: visitor.id,
  });
  return visitor;
}

export async function updateVisitor(
  session: AuthContext,
  visitorId: string,
  input: Partial<{
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    gender: MemberGender;
    address: string | null;
    howHeard: string | null;
    firstVisitDate: Date | null;
    status: VisitorStatus;
    notes: string | null;
  }>,
) {
  requirePermission(session, "visitors:manage");
  const existing = await getVisitor(session, visitorId);
  const visitor = await prisma.visitor.update({
    where: { id: existing.id },
    data: {
      firstName: input.firstName?.trim(),
      lastName: input.lastName?.trim(),
      phone: input.phone === undefined ? undefined : input.phone?.trim() || null,
      email: input.email === undefined ? undefined : input.email?.trim() || null,
      gender: input.gender,
      address: input.address === undefined ? undefined : input.address?.trim() || null,
      howHeard: input.howHeard === undefined ? undefined : input.howHeard?.trim() || null,
      firstVisitDate: input.firstVisitDate,
      status: input.status,
      notes: input.notes === undefined ? undefined : input.notes?.trim() || null,
    },
    include: visitorInclude,
  });
  await writeAuditLog({
    churchId: existing.churchId,
    userId: session.userId,
    action: "visitor.update",
    entityType: "visitor",
    entityId: visitor.id,
  });
  return visitor;
}

export async function addVisitorVisit(
  session: AuthContext,
  visitorId: string,
  input: {
    serviceId: string;
    visitDate?: Date | null;
    followUpStatus?: VisitFollowUpStatus;
    notes?: string | null;
  },
) {
  requirePermission(session, "visitors:manage");
  const churchId = requireChurch(session);
  const visitor = await getVisitor(session, visitorId);
  const service = await prisma.service.findFirst({
    where: tenantWhere(churchId, { id: input.serviceId }),
  });
  if (!service) {
    throw new NotFoundError();
  }
  const visit = await prisma.visitorVisit.create({
    data: {
      visitorId: visitor.id,
      serviceId: service.id,
      visitDate: input.visitDate ?? service.serviceDate,
      followUpStatus: input.followUpStatus ?? "NONE",
      notes: input.notes?.trim() || null,
    },
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "visitor.visit.add",
    entityType: "visitor",
    entityId: visitor.id,
    newData: { serviceId: service.id },
  });
  return visit;
}

export async function convertVisitor(
  session: AuthContext,
  visitorId: string,
  input: {
    membershipNumber: string;
    membershipStatusId: string;
    zoneId?: string | null;
  },
) {
  requirePermission(session, "visitors:manage");
  requirePermission(session, "members:manage");
  const visitor = await getVisitor(session, visitorId);
  if (visitor.status === "CONVERTED" || visitor.convertedMemberId) {
    throw new ConflictError("This visitor has already been converted to a member");
  }
  const member = await createMember(session, {
    membershipNumber: input.membershipNumber,
    firstName: visitor.firstName,
    lastName: visitor.lastName,
    gender: visitor.gender,
    phone: visitor.phone,
    email: visitor.email,
    address: visitor.address,
    membershipStatusId: input.membershipStatusId,
    zoneId: input.zoneId ?? null,
    notes: visitor.notes,
  });
  const updated = await prisma.visitor.update({
    where: { id: visitor.id },
    data: {
      status: "CONVERTED",
      convertedMemberId: member.id,
    },
    include: visitorInclude,
  });
  await writeAuditLog({
    churchId: visitor.churchId,
    userId: session.userId,
    action: "visitor.convert",
    entityType: "visitor",
    entityId: visitor.id,
    newData: { memberId: member.id },
  });
  return updated;
}
