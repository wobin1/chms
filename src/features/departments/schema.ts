import { z } from "zod";

export const departmentSchema = z
  .object({
    name: z.string().min(1).max(80),
    description: z.string().max(500).optional().nullable(),
  })
  .strict();

export const updateDepartmentSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(500).optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

export const departmentMemberSchema = z
  .object({
    memberId: z.string().uuid(),
    role: z.string().min(1).max(40).optional(),
  })
  .strict();
