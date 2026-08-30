import { z } from "zod";

export const zoneSchema = z
  .object({
    name: z.string().min(1).max(80),
    description: z.string().max(500).optional().nullable(),
  })
  .strict();

export const updateZoneSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(500).optional().nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

export const assignLeaderSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();
