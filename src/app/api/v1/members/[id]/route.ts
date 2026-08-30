import { NextRequest, NextResponse } from "next/server";
import {
  memberPatchSchema,
  parseOptionalDate,
} from "@/features/members/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getMember, updateMember } from "@/lib/member-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const member = await getMember(session, id);
    return NextResponse.json(member);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = memberPatchSchema.parse(await req.json());
    const member = await updateMember(session, id, {
      ...body,
      email: body.email === "" ? null : body.email,
      dateOfBirth:
        body.dateOfBirth !== undefined
          ? parseOptionalDate(body.dateOfBirth)
          : undefined,
      dateJoined:
        body.dateJoined !== undefined
          ? parseOptionalDate(body.dateJoined)
          : undefined,
    });
    return NextResponse.json(member);
  } catch (error) {
    return toErrorResponse(error);
  }
}
