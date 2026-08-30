import { NextRequest, NextResponse } from "next/server";
import { prayerRequestWriteSchema } from "@/features/care/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import {
  createPrayerRequest,
  listPrayerRequests,
} from "@/lib/prayer-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listPrayerRequests(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = prayerRequestWriteSchema.parse(await req.json());
    const request = await createPrayerRequest(session, body);
    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
