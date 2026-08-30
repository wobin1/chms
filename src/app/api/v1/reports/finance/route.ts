import { NextRequest, NextResponse } from "next/server";
import { reportFormatQuerySchema } from "@/features/reports/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { csvResponse } from "@/lib/csv-response";
import { financeReportToCsv, getFinanceReport } from "@/lib/report-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const format = req.nextUrl.searchParams.get("format") ?? undefined;
    const query = reportFormatQuerySchema.parse(format ? { format } : {});
    const report = await getFinanceReport(session);
    if (query.format === "csv") {
      return csvResponse(financeReportToCsv(report), "finance-report.csv");
    }
    return NextResponse.json(report);
  } catch (error) {
    return toErrorResponse(error);
  }
}
