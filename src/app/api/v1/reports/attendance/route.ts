import { NextRequest, NextResponse } from "next/server";
import { attendanceReportQuerySchema } from "@/features/reports/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { csvResponse } from "@/lib/csv-response";
import {
  attendanceReportToCsv,
  getAttendanceReport,
} from "@/lib/report-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const groupBy = req.nextUrl.searchParams.get("groupBy") ?? undefined;
    const format = req.nextUrl.searchParams.get("format") ?? undefined;
    const query = attendanceReportQuerySchema.parse({
      ...(groupBy ? { groupBy } : {}),
      ...(format ? { format } : {}),
    });
    const report = await getAttendanceReport(session, query.groupBy);
    if (query.format === "csv") {
      return csvResponse(attendanceReportToCsv(report), "attendance-report.csv");
    }
    return NextResponse.json(report);
  } catch (error) {
    return toErrorResponse(error);
  }
}
