import { z } from "zod";

export const familySchema = z
  .object({
    name: z.string().min(1).max(80),
    address: z.string().max(200).optional().nullable(),
  })
  .strict();

export const updateFamilySchema = familySchema.partial();

export const familyMemberSchema = z
  .object({
    memberId: z.string().uuid(),
    relationship: z.string().min(1).max(40),
  })
  .strict();
