import "server-only";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError } from "./errors";
import { prisma } from "./db";
import { assertMemberBelongsToChurch } from "./member-rules";
import { requirePermission } from "./permissions";
import { throwIfUniqueConflict } from "./prisma-errors";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const givingInclude = {
  givingType: { select: { id: true, name: true } },
  member: {
    select: { id: true, firstName: true, lastName: true, membershipNumber: true },
  },
  service: { select: { id: true, name: true, serviceDate: true } },
  recordedBy: { select: { id: true, name: true } },
};

function moneyString(value: Prisma.Decimal | string | number) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toFixed(2);
  return value.toFixed(2);
}

function serializeGiving<T extends { amount: Prisma.Decimal | string | number }>(
  row: T,
) {
  return { ...row, amount: moneyString(row.amount) };
}

export async function listGivingTypes(
  session: AuthContext,
  filters: ListFilters = {},
) {
  requirePermission(session, "finance:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? { name: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.givingType.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.givingType.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createGivingType(
  session: AuthContext,
  input: { name: string; description?: string | null; status?: "ACTIVE" | "INACTIVE" },
) {
  requirePermission(session, "finance:manage");
  const churchId = requireChurch(session);
  try {
    const row = await prisma.givingType.create({
      data: {
        churchId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        status: input.status ?? "ACTIVE",
      },
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "giving_type.create",
      entityType: "giving_type",
      entityId: row.id,
      newData: { name: row.name },
    });
    return row;
  } catch (error) {
    throwIfUniqueConflict(error, "A giving type with that name already exists");
  }
}

export async function listGiving(session: AuthContext, filters: ListFilters = {}) {
  requirePermission(session, "finance:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? {
          OR: [
            { reference: { contains: filters.q, mode: "insensitive" as const } },
            { paymentMethod: { contains: filters.q, mode: "insensitive" as const } },
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
  const [rows, total] = await Promise.all([
    prisma.giving.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: givingInclude,
      skip,
      take,
    }),
    prisma.giving.count({ where }),
  ]);
  return { items: rows.map(serializeGiving), total, page, pageSize };
}

export async function getGiving(session: AuthContext, givingId: string) {
  requirePermission(session, "finance:read");
  const churchId = requireChurch(session);
  const row = await prisma.giving.findFirst({
    where: tenantWhere(churchId, { id: givingId }),
    include: givingInclude,
  });
  if (!row) {
    throw new NotFoundError();
  }
  return serializeGiving(row);
}

export async function createGiving(
  session: AuthContext,
  input: {
    givingTypeId: string;
    amount: string;
    paymentMethod: string;
    memberId?: string | null;
    serviceId?: string | null;
    transactionReference?: string | null;
  },
) {
  requirePermission(session, "finance:manage");
  const churchId = requireChurch(session);
  const givingType = await prisma.givingType.findFirst({
    where: tenantWhere(churchId, { id: input.givingTypeId }),
  });
  if (!givingType) {
    throw new NotFoundError();
  }

  let memberId: string | null = null;
  if (input.memberId) {
    const member = await prisma.member.findFirst({
      where: { id: input.memberId, churchId, deletedAt: null },
    });
    assertMemberBelongsToChurch(member, churchId);
    memberId = member.id;
  }

  let serviceId: string | null = null;
  if (input.serviceId) {
    const service = await prisma.service.findFirst({
      where: tenantWhere(churchId, { id: input.serviceId }),
    });
    if (!service) {
      throw new NotFoundError();
    }
    serviceId = service.id;
  }

  const row = await prisma.giving.create({
    data: {
      churchId,
      givingTypeId: givingType.id,
      amount: new Prisma.Decimal(input.amount),
      paymentMethod: input.paymentMethod.trim(),
      memberId,
      serviceId,
      transactionReference: input.transactionReference?.trim() || null,
      recordedById: session.userId,
    },
    include: givingInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "giving.create",
    entityType: "giving",
    entityId: row.id,
    newData: { amount: input.amount, givingTypeId: givingType.id },
  });
  return serializeGiving(row);
}
