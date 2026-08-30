import { NextRequest, NextResponse } from "next/server";
import { eventAttendanceWriteSchema } from "@/features/events/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { saveEventAttendance } from "@/lib/event-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = eventAttendanceWriteSchema.parse(await req.json());
    const event = await saveEventAttendance(session, id, body);
    return NextResponse.json(event);
  } catch (error) {
    return toErrorResponse(error);
  }
}
