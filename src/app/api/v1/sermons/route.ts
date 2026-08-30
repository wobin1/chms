import { NextRequest, NextResponse } from "next/server";
import { sermonWriteSchema } from "@/features/content/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createSermon, listSermons } from "@/lib/sermon-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listSermons(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = sermonWriteSchema.parse(await req.json());
    const sermon = await createSermon(session, body);
    return NextResponse.json(sermon, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
