import { NextRequest, NextResponse } from "next/server";
import { updateZoneSchema } from "@/features/zones/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getZone, updateZone } from "@/lib/zone-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const zone = await getZone(session, id);
    return NextResponse.json(zone);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = updateZoneSchema.parse(await req.json());
    const zone = await updateZone(session, id, body);
    return NextResponse.json(zone);
  } catch (error) {
    return toErrorResponse(error);
  }
}
