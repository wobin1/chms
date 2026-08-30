import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { setChurchStatus } from "@/lib/church-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const church = await setChurchStatus(session, id, "ACTIVE");
    return NextResponse.json(church);
  } catch (error) {
    return toErrorResponse(error);
  }
}
