import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { servicePatchSchema } from "@/features/services/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getService, updateService } from "@/lib/service-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const service = await getService(session, id);
    return NextResponse.json(service);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = servicePatchSchema.parse(await req.json());
    const service = await updateService(session, id, {
      ...body,
      serviceDate:
        body.serviceDate !== undefined
          ? parseOptionalDate(body.serviceDate) ?? undefined
          : undefined,
    });
    return NextResponse.json(service);
  } catch (error) {
    return toErrorResponse(error);
  }
}
