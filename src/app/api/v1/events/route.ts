import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { eventWriteSchema } from "@/features/events/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createEvent, listEvents } from "@/lib/event-service";
import { ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listEvents(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = eventWriteSchema.parse(await req.json());
    const startDate = parseOptionalDate(body.startDate);
    const endDate = parseOptionalDate(body.endDate);
    if (!startDate || !endDate) {
      throw new ValidationError("Start date and end date are required");
    }
    const event = await createEvent(session, {
      ...body,
      startDate,
      endDate,
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
