import { NextRequest, NextResponse } from "next/server";
import { pastoralCaseWriteSchema } from "@/features/care/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createPastoralCase, listPastoralCases } from "@/lib/pastoral-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listPastoralCases(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = pastoralCaseWriteSchema.parse(await req.json());
    const pastoralCase = await createPastoralCase(session, body);
    return NextResponse.json(pastoralCase, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
