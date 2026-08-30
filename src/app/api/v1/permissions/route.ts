import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listChurchPermissionCatalog } from "@/lib/user-service";

export async function GET() {
  try {
    const session = await requireSession();
    const items = await listChurchPermissionCatalog(session);
    return NextResponse.json({ items });
  } catch (error) {
    return toErrorResponse(error);
  }
}
