import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { restoreMember } from "@/lib/member-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const member = await restoreMember(session, id);
    return NextResponse.json(member);
  } catch (error) {
    return toErrorResponse(error);
  }
}
