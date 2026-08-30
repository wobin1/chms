import { NextRequest, NextResponse } from "next/server";
import { serviceTypeSchema } from "@/features/services/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createServiceType, listServiceTypes } from "@/lib/service-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listServiceTypes(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = serviceTypeSchema.parse(await req.json());
    const item = await createServiceType(session, body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
