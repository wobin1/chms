import { NextRequest, NextResponse } from "next/server";
import { prayerRequestPatchSchema } from "@/features/care/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getPrayerRequest, updatePrayerRequest } from "@/lib/prayer-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const request = await getPrayerRequest(session, id);
    return NextResponse.json(request);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = prayerRequestPatchSchema.parse(await req.json());
    const request = await updatePrayerRequest(session, id, body);
    return NextResponse.json(request);
  } catch (error) {
    return toErrorResponse(error);
  }
}
