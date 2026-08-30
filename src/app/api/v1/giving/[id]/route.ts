import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getGiving } from "@/lib/giving-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const giving = await getGiving(session, id);
    return NextResponse.json(giving);
  } catch (error) {
    return toErrorResponse(error);
  }
}
