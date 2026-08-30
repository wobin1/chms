import { NextRequest, NextResponse } from "next/server";
import { sermonPatchSchema } from "@/features/content/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getSermon, updateSermon } from "@/lib/sermon-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const sermon = await getSermon(session, id);
    return NextResponse.json(sermon);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = sermonPatchSchema.parse(await req.json());
    const sermon = await updateSermon(session, id, body);
    return NextResponse.json(sermon);
  } catch (error) {
    return toErrorResponse(error);
  }
}
