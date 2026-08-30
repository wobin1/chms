import { z } from "zod";

const optionalDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
  .optional()
  .nullable();

export const memberWriteSchema = z
  .object({
    membershipNumber: z.string().min(1).max(40),
    firstName: z.string().min(1).max(80),
    middleName: z.string().max(80).optional().nullable(),
    lastName: z.string().min(1).max(80),
    gender: z.enum(["FEMALE", "MALE", "OTHER", "UNSPECIFIED"]).optional(),
    dateOfBirth: optionalDate,
    phone: z.string().max(40).optional().nullable(),
    email: z.union([z.string().email(), z.literal("")]).optional().nullable(),
    address: z.string().max(200).optional().nullable(),
    city: z.string().max(80).optional().nullable(),
    state: z.string().max(80).optional().nullable(),
    occupation: z.string().max(80).optional().nullable(),
    maritalStatus: z.string().max(40).optional().nullable(),
    dateJoined: optionalDate,
    membershipStatusId: z.string().uuid(),
    zoneId: z.string().uuid().optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),
    photoPublicId: z.string().max(200).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
  })
  .strict();

export const memberPatchSchema = memberWriteSchema.partial();

export function parseOptionalDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}
