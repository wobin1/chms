import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(10),
    roleName: z.string().min(1),
    memberId: z.string().uuid().optional().nullable(),
  })
  .strict();

export const patchUserSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    roleName: z.string().min(1).optional(),
    memberId: z.string().uuid().optional().nullable(),
    status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  })
  .strict();

export const rolePermissionsSchema = z
  .object({
    permissions: z.array(z.string().min(1).max(80)).max(50),
  })
  .strict();
