import { NextRequest, NextResponse } from "next/server";
import { updateMinistrySchema } from "@/features/ministries/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getMinistry, updateMinistry } from "@/lib/ministry-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const ministry = await getMinistry(session, id);
    return NextResponse.json(ministry);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = updateMinistrySchema.parse(await req.json());
    const ministry = await updateMinistry(session, id, body);
    return NextResponse.json(ministry);
  } catch (error) {
    return toErrorResponse(error);
  }
}
