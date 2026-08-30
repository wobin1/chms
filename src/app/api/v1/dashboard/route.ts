import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getChurchDashboard } from "@/lib/dashboard-service";

export async function GET() {
  try {
    const session = await requireSession();
    const dashboard = await getChurchDashboard(session);
    return NextResponse.json(dashboard);
  } catch (error) {
    return toErrorResponse(error);
  }
}
