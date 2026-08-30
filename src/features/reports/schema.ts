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

export type AttendanceGroupBy = z.infer<typeof attendanceGroupBySchema>;
