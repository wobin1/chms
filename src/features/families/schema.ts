import { z } from "zod";

export const familySchema = z
  .object({
    name: z.string().min(1).max(80),
    address: z.string().max(200).optional().nullable(),
  })
  .strict();

export const updateFamilySchema = familySchema.partial();

export const familyRelationshipSchema = z.string().min(1).max(40);

export const familyMemberSchema = z
  .object({
    memberId: z.string().uuid(),
    relationship: familyRelationshipSchema,
  })
  .strict();

export const familyMembersWriteSchema = z
  .object({
    memberIds: z.array(z.string().uuid()).min(1).max(50),
    relationship: familyRelationshipSchema,
  })
  .strict();

export function parseFamilyMemberWrite(body: unknown): {
  members: { memberId: string; relationship: string }[];
} {
  const single = familyMemberSchema.safeParse(body);
  if (single.success) {
    return { members: [single.data] };
  }
  const batch = familyMembersWriteSchema.parse(body);
  return {
    members: batch.memberIds.map((memberId) => ({
      memberId,
      relationship: batch.relationship,
    })),
  };
}
