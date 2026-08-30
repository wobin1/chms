import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { childPatchSchema } from "@/features/children/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getChild, updateChild } from "@/lib/child-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const child = await getChild(session, id);
    return NextResponse.json(child);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = childPatchSchema.parse(await req.json());
    const child = await updateChild(session, id, {
      ...body,
      dateOfBirth:
        body.dateOfBirth !== undefined
          ? parseOptionalDate(body.dateOfBirth)
          : undefined,
    });
    return NextResponse.json(child);
  } catch (error) {
    return toErrorResponse(error);
  }
}
