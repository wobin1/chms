import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { eventPatchSchema } from "@/features/events/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getEvent, updateEvent } from "@/lib/event-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const event = await getEvent(session, id);
    return NextResponse.json(event);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = eventPatchSchema.parse(await req.json());
    const event = await updateEvent(session, id, {
      ...body,
      startDate:
        body.startDate !== undefined
          ? parseOptionalDate(body.startDate) ?? undefined
          : undefined,
      endDate:
        body.endDate !== undefined
          ? parseOptionalDate(body.endDate) ?? undefined
          : undefined,
    });
    return NextResponse.json(event);
  } catch (error) {
    return toErrorResponse(error);
  }
}
