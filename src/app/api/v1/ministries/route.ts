import { NextRequest, NextResponse } from "next/server";
import { ministrySchema } from "@/features/ministries/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createMinistry, listMinistries } from "@/lib/ministry-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listMinistries(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = ministrySchema.parse(await req.json());
    const ministry = await createMinistry(session, body);
    return NextResponse.json(ministry, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
