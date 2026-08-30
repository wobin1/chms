import { NextRequest, NextResponse } from "next/server";
import { parseOptionalDate } from "@/features/members/schema";
import { announcementPatchSchema } from "@/features/content/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getAnnouncement, updateAnnouncement } from "@/lib/announcement-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const announcement = await getAnnouncement(session, id);
    return NextResponse.json(announcement);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = announcementPatchSchema.parse(await req.json());
    const announcement = await updateAnnouncement(session, id, {
      ...body,
      startDate:
        body.startDate !== undefined
          ? parseOptionalDate(body.startDate) ?? undefined
          : undefined,
      endDate:
        body.endDate !== undefined
          ? parseOptionalDate(body.endDate) ?? undefined
          : undefined,
    });
    return NextResponse.json(announcement);
  } catch (error) {
    return toErrorResponse(error);
  }
}
