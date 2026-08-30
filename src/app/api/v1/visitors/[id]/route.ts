import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { visitorPatchSchema } from "@/features/services/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getVisitor, updateVisitor } from "@/lib/visitor-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const visitor = await getVisitor(session, id);
    return NextResponse.json(visitor);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = visitorPatchSchema.parse(await req.json());
    const visitor = await updateVisitor(session, id, {
      ...body,
      email: body.email === "" ? null : body.email,
      firstVisitDate:
        body.firstVisitDate !== undefined
          ? parseOptionalDate(body.firstVisitDate)
          : undefined,
    });
    return NextResponse.json(visitor);
  } catch (error) {
    return toErrorResponse(error);
  }
}
