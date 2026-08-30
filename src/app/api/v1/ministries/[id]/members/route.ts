import { NextRequest, NextResponse } from "next/server";
import { ministryMemberSchema } from "@/features/ministries/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import {
  assignMinistryMember,
  removeMinistryMember,
} from "@/lib/ministry-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = ministryMemberSchema.parse(await req.json());
    const row = await assignMinistryMember(session, id, body);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const memberId = req.nextUrl.searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }
    await removeMinistryMember(session, id, memberId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
