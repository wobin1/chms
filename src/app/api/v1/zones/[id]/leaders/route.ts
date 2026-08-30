import { NextRequest, NextResponse } from "next/server";
import { assignLeaderSchema } from "@/features/zones/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assignZoneLeader, removeZoneLeader } from "@/lib/zone-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = assignLeaderSchema.parse(await req.json());
    const leader = await assignZoneLeader(session, id, body.userId);
    return NextResponse.json(leader, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: Params,
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    await removeZoneLeader(session, id, userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
