import { describe, expect, it } from "vitest";
import { expenseWriteSchema, givingWriteSchema } from "./schema";

describe("finance schemas", () => {
  it("allows giving without a member (anonymous)", () => {
    const parsed = givingWriteSchema.parse({
      givingTypeId: "11111111-1111-4111-8111-111111111111",
      amount: "50.00",
      paymentMethod: "Cash",
    });
    expect(parsed.memberId).toBeUndefined();
    expect(parsed.amount).toBe("50.00");
  });

  it("rejects a zero or negative giving amount", () => {
    expect(() =>
      givingWriteSchema.parse({
        givingTypeId: "11111111-1111-4111-8111-111111111111",
        amount: 0,
        paymentMethod: "Cash",
      }),
    ).toThrow();
    expect(() =>
      givingWriteSchema.parse({
        givingTypeId: "11111111-1111-4111-8111-111111111111",
        amount: -5,
        paymentMethod: "Cash",
      }),
    ).toThrow();
  });

  it("rejects a churchId on a giving payload", () => {
    expect(() =>
      givingWriteSchema.parse({
        givingTypeId: "11111111-1111-4111-8111-111111111111",
        amount: "10.00",
        paymentMethod: "Cash",
        churchId: "should-not-be-accepted",
      }),
    ).toThrow();
  });

  it("requires an expense date, category, and positive amount", () => {
    const parsed = expenseWriteSchema.parse({
      categoryId: "11111111-1111-4111-8111-111111111111",
      amount: 12.5,
      description: "Generator fuel",
      expenseDate: "2026-08-29",
      paymentMethod: "Transfer",
    });
    expect(parsed.amount).toBe("12.50");
  });
});
