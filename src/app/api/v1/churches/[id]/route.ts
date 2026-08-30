import { NextRequest, NextResponse } from "next/server";
import { updateChurchSchema } from "@/features/churches/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import {
  getChurchByIdForSession,
  updateChurchAsPlatform,
} from "@/lib/church-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const church = await getChurchByIdForSession(session, id);
    return NextResponse.json(church);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = updateChurchSchema.parse(await req.json());
    const church = await updateChurchAsPlatform(session, id, body);
    return NextResponse.json(church);
  } catch (error) {
    return toErrorResponse(error);
  }
}
