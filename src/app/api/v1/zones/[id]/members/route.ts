import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listZoneMembers } from "@/lib/member-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const result = await listZoneMembers(session, id);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
