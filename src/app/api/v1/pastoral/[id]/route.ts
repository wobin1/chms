import { NextRequest, NextResponse } from "next/server";
import { pastoralCasePatchSchema } from "@/features/care/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getPastoralCase, updatePastoralCase } from "@/lib/pastoral-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const pastoralCase = await getPastoralCase(session, id);
    return NextResponse.json(pastoralCase);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = pastoralCasePatchSchema.parse(await req.json());
    const pastoralCase = await updatePastoralCase(session, id, body);
    return NextResponse.json(pastoralCase);
  } catch (error) {
    return toErrorResponse(error);
  }
}
