import { NextRequest, NextResponse } from "next/server";
import { visitorConvertSchema } from "@/features/services/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { convertVisitor } from "@/lib/visitor-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = visitorConvertSchema.parse(await req.json());
    const visitor = await convertVisitor(session, id, body);
    return NextResponse.json(visitor);
  } catch (error) {
    return toErrorResponse(error);
  }
}
