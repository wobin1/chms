import { NextRequest, NextResponse } from "next/server";
import { attendanceWriteSchema } from "@/features/services/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { saveServiceAttendance } from "@/lib/service-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = attendanceWriteSchema.parse(await req.json());
    const service = await saveServiceAttendance(session, id, body);
    return NextResponse.json(service);
  } catch (error) {
    return toErrorResponse(error);
  }
}
