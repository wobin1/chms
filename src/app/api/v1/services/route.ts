import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { serviceWriteSchema } from "@/features/services/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createService, listServices } from "@/lib/service-service";
import { ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listServices(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = serviceWriteSchema.parse(await req.json());
    const serviceDate = parseOptionalDate(body.serviceDate);
    if (!serviceDate) {
      throw new ValidationError("Service date is required");
    }
    const service = await createService(session, {
      ...body,
      serviceDate,
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
