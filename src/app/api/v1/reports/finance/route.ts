import { NextRequest, NextResponse } from "next/server";
import { financeReportQuerySchema } from "@/features/reports/schema";
import { toErrorResponse } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { csvResponse } from "@/lib/csv-response";
import { financeReportToCsv, getFinanceReport } from "@/lib/report-service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = financeReportQuerySchema.parse(
      Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== ""),
      ),
    );
    const report = await getFinanceReport(session, query);
    if (query.format === "csv") {
      return csvResponse(financeReportToCsv(report), "finance-report.csv");
    }
    return NextResponse.json(report);
  } catch (error) {
    return toErrorResponse(error);
  }
}
