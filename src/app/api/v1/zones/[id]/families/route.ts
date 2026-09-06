import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listZoneFamilies } from "@/lib/family-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const result = await listZoneFamilies(session, id);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
