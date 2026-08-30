import { z } from "zod";

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .optional()
  .nullable();

export const namedLookupSchema = z
  .object({
    name: z.string().min(1).max(80),
  })
  .strict();

export const serviceTypeSchema = namedLookupSchema;

export const attendanceCategorySchema = z
  .object({
    name: z.string().min(1).max(80),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict();

export const serviceWriteSchema = z
  .object({
    serviceTypeId: z.string().uuid(),
    serviceDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    name: z.string().min(1).max(120),
    theme: z.string().max(200).optional().nullable(),
    scripture: z.string().max(200).optional().nullable(),
    preacher: z.string().max(120).optional().nullable(),
    startTime: z.string().max(8).optional().nullable(),
    endTime: z.string().max(8).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  })
  .strict();

export const servicePatchSchema = serviceWriteSchema.partial();

export const attendanceCountItemSchema = z
  .object({
    attendanceCategoryId: z.string().uuid(),
    count: z.number().int().min(0),
  })
  .strict();

export const attendanceWriteSchema = z
  .object({
    items: z.array(attendanceCountItemSchema).min(1),
  })
  .strict();

export const visitorWriteSchema = z
  .object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    phone: z.string().max(40).optional().nullable(),
    email: z.union([z.string().email(), z.literal("")]).optional().nullable(),
    gender: z.enum(["FEMALE", "MALE", "OTHER", "UNSPECIFIED"]).optional(),
    address: z.string().max(200).optional().nullable(),
    howHeard: z.string().max(120).optional().nullable(),
    firstVisitDate: optionalDate,
    status: z
      .enum([
        "NEW",
        "FOLLOW_UP",
        "CONTACTED",
        "RETURNING",
        "CONVERTED",
        "CLOSED",
      ])
      .optional(),
    notes: z.string().max(4000).optional().nullable(),
  })
  .strict();

export const visitorPatchSchema = visitorWriteSchema.partial();

export const visitorVisitSchema = z
  .object({
    serviceId: z.string().uuid(),
    visitDate: optionalDate,
    followUpStatus: z
      .enum(["NONE", "PENDING", "CONTACTED", "CLOSED"])
      .optional(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const visitorConvertSchema = z
  .object({
    membershipNumber: z.string().min(1).max(40),
    membershipStatusId: z.string().uuid(),
    zoneId: z.string().uuid().optional().nullable(),
  })
  .strict();
