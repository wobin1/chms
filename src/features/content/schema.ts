import { z } from "zod";

const requiredDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const optionalMediaUrl = z.preprocess(
  (value) => (value === "" ? null : value),
  z
    .string()
    .url()
    .max(500)
    .refine(
      (value) => value.startsWith("http://") || value.startsWith("https://"),
      "Media URL must be http or https",
    )
    .nullable()
    .optional(),
);

export const sermonWriteSchema = z
  .object({
    serviceId: z.string().uuid(),
    title: z.string().min(1).max(200),
    preacher: z.string().min(1).max(120),
    scripture: z.string().max(200).optional().nullable(),
    summary: z.string().max(4000).optional().nullable(),
    audioUrl: optionalMediaUrl,
    videoUrl: optionalMediaUrl,
    documentUrl: optionalMediaUrl,
  })
  .strict();

export const sermonPatchSchema = sermonWriteSchema.partial();

export const announcementWriteSchema = z
  .object({
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(8000),
    startDate: requiredDate,
    endDate: requiredDate,
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .strict();

export const announcementPatchSchema = announcementWriteSchema.partial();
