import { NextRequest, NextResponse } from "next/server";
import { givingWriteSchema } from "@/features/finance/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createGiving, listGiving } from "@/lib/giving-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listGiving(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = givingWriteSchema.parse(await req.json());
    const giving = await createGiving(session, body);
    return NextResponse.json(giving, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
