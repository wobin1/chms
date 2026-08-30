import { NextRequest, NextResponse } from "next/server";
import { givingTypeSchema } from "@/features/finance/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createGivingType, listGivingTypes } from "@/lib/giving-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listGivingTypes(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = givingTypeSchema.parse(await req.json());
    const type = await createGivingType(session, body);
    return NextResponse.json(type, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
