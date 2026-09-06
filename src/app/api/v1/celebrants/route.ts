import { NextRequest, NextResponse } from "next/server";
import { celebrantQuerySchema } from "@/features/celebrants/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listCelebrants } from "@/lib/celebrant-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const query = celebrantQuerySchema.parse({
      period: req.nextUrl.searchParams.get("period") ?? undefined,
      on: req.nextUrl.searchParams.get("on") ?? undefined,
    });
    const result = await listCelebrants(session, query);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
