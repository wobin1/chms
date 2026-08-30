import { z } from "zod";

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .optional()
  .nullable();

export const childGuardianSchema = z
  .object({
    memberId: z.string().uuid(),
    relationship: z.string().min(1).max(40),
  })
  .strict();

export const childWriteSchema = z
  .object({
    familyId: z.string().uuid(),
    firstName: z.string().min(1).max(80),
    middleName: z.string().max(80).optional().nullable(),
    lastName: z.string().min(1).max(80),
    gender: z.enum(["FEMALE", "MALE", "OTHER", "UNSPECIFIED"]).optional(),
    dateOfBirth: optionalDate,
    school: z.string().max(120).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    guardians: z.array(childGuardianSchema).max(20).optional(),
  })
  .strict();

export const childPatchSchema = childWriteSchema
  .omit({ familyId: true, guardians: true })
  .partial();
