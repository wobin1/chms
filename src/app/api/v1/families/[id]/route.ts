import { NextRequest, NextResponse } from "next/server";
import { updateFamilySchema } from "@/features/families/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getFamily, updateFamily } from "@/lib/family-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const family = await getFamily(session, id);
    return NextResponse.json(family);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = updateFamilySchema.parse(await req.json());
    const family = await updateFamily(session, id, body);
    return NextResponse.json(family);
  } catch (error) {
    return toErrorResponse(error);
  }
}
