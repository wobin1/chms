import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { signUploadParams } from "@/lib/cloudinary";
import { requireChurch } from "@/lib/tenant";

const bodySchema = z
  .object({
    entity: z.enum(["members", "church"]),
    entityId: z.string().uuid(),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const churchId = requireChurch(session);
    const body = bodySchema.parse(await req.json());
    return NextResponse.json(
      signUploadParams({
        churchId,
        entity: body.entity,
        entityId: body.entityId,
      }),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
