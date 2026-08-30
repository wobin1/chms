import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "./errors";

const expenseFindMany = vi.fn();
const expenseCount = vi.fn();
const expenseFindFirst = vi.fn();
const expenseCreate = vi.fn();
const categoryFindFirst = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    expense: {
      findMany: (...args: unknown[]) => expenseFindMany(...args),
      count: (...args: unknown[]) => expenseCount(...args),
      findFirst: (...args: unknown[]) => expenseFindFirst(...args),
      create: (...args: unknown[]) => expenseCreate(...args),
    },
    expenseCategory: {
      findFirst: (...args: unknown[]) => categoryFindFirst(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["finance:manage", "finance:read"],
};

describe("expense service isolation", () => {
  beforeEach(() => {
    expenseFindMany.mockReset();
    expenseCount.mockReset();
    expenseFindFirst.mockReset();
    expenseCreate.mockReset();
    categoryFindFirst.mockReset();
  });

  it("lists expenses only for the session church", async () => {
    expenseFindMany.mockResolvedValue([]);
    expenseCount.mockResolvedValue(0);
    const { listExpenses } = await import("./expense-service");
    const result = await listExpenses(churchAdmin);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(expenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("returns not found for an expense in another church", async () => {
    expenseFindFirst.mockResolvedValue(null);
    const { getExpense } = await import("./expense-service");
    await expect(getExpense(churchAdmin, "expense-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects an expense category from another church", async () => {
    categoryFindFirst.mockResolvedValue(null);
    const { createExpense } = await import("./expense-service");
    await expect(
      createExpense(churchAdmin, {
        categoryId: "cat-b",
        amount: "30.00",
        description: "Fuel",
        expenseDate: new Date("2026-08-29"),
        paymentMethod: "Cash",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(expenseCreate).not.toHaveBeenCalled();
  });

  it("rejects a zone leader recording an expense", async () => {
    const { createExpense } = await import("./expense-service");
    await expect(
      createExpense(
        {
          userId: "zl",
          churchId: "church-a",
          permissions: ["members:read", "zones:read"],
        },
        {
          categoryId: "cat-a",
          amount: "10.00",
          description: "Fuel",
          expenseDate: new Date("2026-08-29"),
          paymentMethod: "Cash",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
