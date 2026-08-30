import { z } from "zod";

const moneyAmount = z
  .union([
    z.number().positive(),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((value) => Number(value) > 0, "Amount must be greater than zero"),
  ])
  .transform((value) => (typeof value === "number" ? value.toFixed(2) : value));

export const givingTypeSchema = z
  .object({
    name: z.string().min(1).max(80),
    description: z.string().max(200).optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

export const givingWriteSchema = z
  .object({
    givingTypeId: z.string().uuid(),
    amount: moneyAmount,
    memberId: z.string().uuid().optional().nullable(),
    serviceId: z.string().uuid().optional().nullable(),
    paymentMethod: z.string().min(1).max(40),
    transactionReference: z.string().max(80).optional().nullable(),
  })
  .strict();

export const expenseCategorySchema = z
  .object({
    name: z.string().min(1).max(80),
    description: z.string().max(200).optional().nullable(),
  })
  .strict();

export const expenseWriteSchema = z
  .object({
    categoryId: z.string().uuid(),
    amount: moneyAmount,
    description: z.string().min(1).max(200),
    expenseDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    paymentMethod: z.string().min(1).max(40),
    reference: z.string().max(80).optional().nullable(),
  })
  .strict();
