import { NextRequest, NextResponse } from "next/server";
import { familySchema } from "@/features/families/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createFamily, listFamilies } from "@/lib/family-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listFamilies(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = familySchema.parse(await req.json());
    const family = await createFamily(session, body);
    return NextResponse.json(family, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
