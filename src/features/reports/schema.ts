import { z } from "zod";

export const attendanceGroupBySchema = z.enum([
  "sunday",
  "month",
  "year",
  "serviceType",
]);

export const attendanceReportQuerySchema = z
  .object({
    groupBy: attendanceGroupBySchema.optional().default("sunday"),
    format: z.enum(["json", "csv"]).optional(),
  })
  .strict();

export const reportFormatQuerySchema = z
  .object({
    format: z.enum(["json", "csv"]).optional(),
  })
  .strict();

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const financeGroupBySchema = z.enum(["week", "month", "year"]);

export const financeReportQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    groupBy: financeGroupBySchema.optional().default("month"),
    format: z.enum(["json", "csv"]).optional(),
  })
  .strict();

export type AttendanceGroupBy = z.infer<typeof attendanceGroupBySchema>;
export type FinanceGroupBy = z.infer<typeof financeGroupBySchema>;
export type FinanceReportQuery = z.infer<typeof financeReportQuerySchema>;
