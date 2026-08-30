import { NextRequest, NextResponse } from "next/server";
import { zoneSchema } from "@/features/zones/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createZone, listZones } from "@/lib/zone-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listZones(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = zoneSchema.parse(await req.json());
    const zone = await createZone(session, body);
    return NextResponse.json(zone, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
