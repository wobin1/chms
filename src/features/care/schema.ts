import { z } from "zod";

export const pastoralCaseStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "ON_HOLD",
  "CLOSED",
]);

export const pastoralCasePrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const prayerRequestStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "ANSWERED",
  "CLOSED",
]);

export const pastoralCaseWriteSchema = z
  .object({
    memberId: z.string().uuid(),
    caseType: z.string().min(1).max(80),
    title: z.string().min(1).max(200),
    description: z.string().max(8000).optional().nullable(),
    notes: z.string().max(8000).optional().nullable(),
    priority: pastoralCasePrioritySchema.optional(),
    status: pastoralCaseStatusSchema.optional(),
    assignedToId: z.string().uuid().optional().nullable(),
  })
  .strict();

export const pastoralCasePatchSchema = pastoralCaseWriteSchema.partial();

export const prayerRequestWriteSchema = z
  .object({
    memberId: z.string().uuid().optional().nullable(),
    title: z.string().min(1).max(200),
    description: z.string().max(8000).optional().nullable(),
    status: prayerRequestStatusSchema.optional(),
    assignedToId: z.string().uuid().optional().nullable(),
  })
  .strict();

export const prayerRequestPatchSchema = prayerRequestWriteSchema.partial();
