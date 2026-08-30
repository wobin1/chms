import { NextRequest, NextResponse } from "next/server";
import { updateTenantChurchSchema } from "@/features/churches/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getCurrentChurch, updateCurrentChurch } from "@/lib/church-service";

export async function GET() {
  try {
    const session = await requireSession();
    const church = await getCurrentChurch(session);
    return NextResponse.json(church);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = updateTenantChurchSchema.parse(await req.json());
    const church = await updateCurrentChurch(session, body);
    return NextResponse.json(church);
  } catch (error) {
    return toErrorResponse(error);
  }
}
