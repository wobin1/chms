import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { visitorWriteSchema } from "@/features/services/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createVisitor, listVisitors } from "@/lib/visitor-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listVisitors(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = visitorWriteSchema.parse(await req.json());
    const visitor = await createVisitor(session, {
      ...body,
      email: body.email || null,
      firstVisitDate: parseOptionalDate(body.firstVisitDate ?? null),
    });
    return NextResponse.json(visitor, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
