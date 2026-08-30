import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { announcementWriteSchema } from "@/features/content/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";
import { createAnnouncement, listAnnouncements } from "@/lib/announcement-service";
import { ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const result = await listAnnouncements(session, parseListParams(req.nextUrl.searchParams));
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = announcementWriteSchema.parse(await req.json());
    const startDate = parseOptionalDate(body.startDate);
    const endDate = parseOptionalDate(body.endDate);
    if (!startDate || !endDate) {
      throw new ValidationError("Start date and end date are required");
    }
    const announcement = await createAnnouncement(session, {
      ...body,
      startDate,
      endDate,
    });
    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
