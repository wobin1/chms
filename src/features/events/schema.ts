import { z } from "zod";

const requiredDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

export const eventWriteSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(4000).optional().nullable(),
    eventType: z.string().min(1).max(80),
    startDate: requiredDate,
    endDate: requiredDate,
    location: z.string().min(1).max(200),
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  })
  .strict();

export const eventPatchSchema = eventWriteSchema.partial();

export const eventAttendanceWriteSchema = z
  .object({
    attendanceCount: z.number().int().min(0),
  })
  .strict();
