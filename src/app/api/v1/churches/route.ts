import { NextRequest, NextResponse } from "next/server";
import { createChurchSchema } from "@/features/churches/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createChurch, listChurches } from "@/lib/church-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const searchParams = req.nextUrl.searchParams;
    const result = await listChurches(session, {
      ...parseListParams(searchParams),
      status: searchParams.get("status") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = createChurchSchema.parse(await req.json());
    const church = await createChurch(session, body);
    return NextResponse.json(church, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
