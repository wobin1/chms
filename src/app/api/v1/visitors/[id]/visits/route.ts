import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { visitorVisitSchema } from "@/features/services/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { addVisitorVisit } from "@/lib/visitor-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = visitorVisitSchema.parse(await req.json());
    const visit = await addVisitorVisit(session, id, {
      ...body,
      visitDate: parseOptionalDate(body.visitDate ?? null),
    });
    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
