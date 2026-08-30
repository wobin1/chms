import { NextRequest, NextResponse } from "next/server";
import { attendanceCategorySchema } from "@/features/services/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import {
  createAttendanceCategory,
  listAttendanceCategories,
} from "@/lib/service-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listAttendanceCategories(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = attendanceCategorySchema.parse(await req.json());
    const item = await createAttendanceCategory(session, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
