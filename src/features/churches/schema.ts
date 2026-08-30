import { z } from "zod";

export const createChurchSchema = z
  .object({
    name: z.string().min(2).max(120),
    slug: z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
    shortName: z.string().max(40).optional().nullable(),
    denomination: z.string().max(80).optional().nullable(),
    address: z.string().max(200).optional().nullable(),
    city: z.string().max(80).optional().nullable(),
    state: z.string().max(80).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    email: z.string().email().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    admin: z.object({
      name: z.string().min(2).max(120),
      email: z.string().email(),
      password: z.string().min(10),
    }),
  })
  .strict();

export const updateChurchSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    slug: z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    shortName: z.string().max(40).optional().nullable(),
    denomination: z.string().max(80).optional().nullable(),
    address: z.string().max(200).optional().nullable(),
    city: z.string().max(80).optional().nullable(),
    state: z.string().max(80).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    email: z.string().email().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    logo: z.string().url().optional().nullable(),
  })
  .strict();

export const updateTenantChurchSchema = updateChurchSchema.omit({ slug: true });
