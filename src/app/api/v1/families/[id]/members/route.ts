import { NextRequest, NextResponse } from "next/server";
import { parseFamilyMemberWrite } from "@/features/families/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import {
  addFamilyMember,
  addFamilyMembers,
  removeFamilyMember,
} from "@/lib/family-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { members } = parseFamilyMemberWrite(await req.json());
    if (members.length === 1) {
      const row = await addFamilyMember(session, id, members[0]);
      return NextResponse.json(row, { status: 201 });
    }
    const rows = await addFamilyMembers(session, id, members);
    return NextResponse.json({ items: rows }, { status: 201 });
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
    await removeFamilyMember(session, id, memberId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
