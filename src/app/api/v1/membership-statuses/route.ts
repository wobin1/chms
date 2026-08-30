import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listMembershipStatuses } from "@/lib/member-service";

export async function GET() {
  try {
    const session = await requireSession();
    const items = await listMembershipStatuses(session);
    return NextResponse.json({ items });
  } catch (error) {
    return toErrorResponse(error);
  }
}
