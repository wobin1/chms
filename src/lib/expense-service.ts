import "server-only";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "./audit";
import type { AuthContext } from "./auth-types";
import { NotFoundError } from "./errors";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { throwIfUniqueConflict } from "./prisma-errors";
import { requireChurch, tenantWhere } from "./tenant";
import { type ListFilters, resolvePagination } from "./pagination";

const expenseInclude = {
  category: { select: { id: true, name: true } },
  recordedBy: { select: { id: true, name: true } },
};

function moneyString(value: Prisma.Decimal | string | number) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toFixed(2);
  return value.toFixed(2);
}

function serializeExpense<T extends { amount: Prisma.Decimal | string | number }>(
  row: T,
) {
  return { ...row, amount: moneyString(row.amount) };
}

export async function listExpenseCategories(
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
    prisma.expenseCategory.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.expenseCategory.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function createExpenseCategory(
  session: AuthContext,
  input: { name: string; description?: string | null },
) {
  requirePermission(session, "finance:manage");
  const churchId = requireChurch(session);
  try {
    const row = await prisma.expenseCategory.create({
      data: {
        churchId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      },
    });
    await writeAuditLog({
      churchId,
      userId: session.userId,
      action: "expense_category.create",
      entityType: "expense_category",
      entityId: row.id,
      newData: { name: row.name },
    });
    return row;
  } catch (error) {
    throwIfUniqueConflict(error, "An expense category with that name already exists");
  }
}

export async function listExpenses(session: AuthContext, filters: ListFilters = {}) {
  requirePermission(session, "finance:read");
  const churchId = requireChurch(session);
  const { page, pageSize, skip, take } = resolvePagination(filters);
  const where = {
    ...tenantWhere(churchId),
    ...(filters.q
      ? {
          OR: [
            { description: { contains: filters.q, mode: "insensitive" as const } },
            { reference: { contains: filters.q, mode: "insensitive" as const } },
            { paymentMethod: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      include: expenseInclude,
      skip,
      take,
    }),
    prisma.expense.count({ where }),
  ]);
  return { items: rows.map(serializeExpense), total, page, pageSize };
}

export async function getExpense(session: AuthContext, expenseId: string) {
  requirePermission(session, "finance:read");
  const churchId = requireChurch(session);
  const row = await prisma.expense.findFirst({
    where: tenantWhere(churchId, { id: expenseId }),
    include: expenseInclude,
  });
  if (!row) {
    throw new NotFoundError();
  }
  return serializeExpense(row);
}

export async function createExpense(
  session: AuthContext,
  input: {
    categoryId: string;
    amount: string;
    description: string;
    expenseDate: Date;
    paymentMethod: string;
    reference?: string | null;
  },
) {
  requirePermission(session, "finance:manage");
  const churchId = requireChurch(session);
  const category = await prisma.expenseCategory.findFirst({
    where: tenantWhere(churchId, { id: input.categoryId }),
  });
  if (!category) {
    throw new NotFoundError();
  }
  const row = await prisma.expense.create({
    data: {
      churchId,
      categoryId: category.id,
      amount: new Prisma.Decimal(input.amount),
      description: input.description.trim(),
      expenseDate: input.expenseDate,
      paymentMethod: input.paymentMethod.trim(),
      reference: input.reference?.trim() || null,
      recordedById: session.userId,
    },
    include: expenseInclude,
  });
  await writeAuditLog({
    churchId,
    userId: session.userId,
    action: "expense.create",
    entityType: "expense",
    entityId: row.id,
    newData: { amount: input.amount, categoryId: category.id },
  });
  return serializeExpense(row);
}
