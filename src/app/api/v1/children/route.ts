import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { childWriteSchema } from "@/features/children/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { createChild, listChildren } from "@/lib/child-service";
import { parseListParams } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const familyId = req.nextUrl.searchParams.get("familyId") ?? undefined;
    const result = await listChildren(session, {
      ...parseListParams(req.nextUrl.searchParams),
      familyId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = childWriteSchema.parse(await req.json());
    const child = await createChild(session, {
      ...body,
      dateOfBirth: parseOptionalDate(body.dateOfBirth ?? null),
    });
    return NextResponse.json(child, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
