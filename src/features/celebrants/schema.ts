import { z } from "zod";

export const celebrantPeriodSchema = z.enum(["month", "week", "day"]);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const celebrantQuerySchema = z
  .object({
    period: celebrantPeriodSchema.optional().default("month"),
    on: isoDateSchema.optional(),
  })
  .strict();

export type CelebrantQuery = z.infer<typeof celebrantQuerySchema>;
