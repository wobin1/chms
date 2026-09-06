import { describe, expect, it } from "vitest";
import {
  attendanceReportQuerySchema,
  financeReportQuerySchema,
} from "./schema";

describe("report schemas", () => {
  it("accepts attendance grouping by sunday, month, year, or service type", () => {
    expect(attendanceReportQuerySchema.parse({ groupBy: "sunday" }).groupBy).toBe(
      "sunday",
    );
    expect(attendanceReportQuerySchema.parse({ groupBy: "month" }).groupBy).toBe(
      "month",
    );
    expect(attendanceReportQuerySchema.parse({ groupBy: "year" }).groupBy).toBe(
      "year",
    );
    expect(
      attendanceReportQuerySchema.parse({ groupBy: "serviceType" }).groupBy,
    ).toBe("serviceType");
  });

  it("rejects a churchId query on attendance reports", () => {
    expect(() =>
      attendanceReportQuerySchema.parse({
        groupBy: "sunday",
        churchId: "should-not-be-accepted",
      }),
    ).toThrow();
  });

  it("accepts finance date range, groupBy, and format", () => {
    const parsed = financeReportQuerySchema.parse({
      from: "2026-01-01",
      to: "2026-03-31",
      groupBy: "week",
      format: "csv",
    });
    expect(parsed.from).toBe("2026-01-01");
    expect(parsed.to).toBe("2026-03-31");
    expect(parsed.groupBy).toBe("week");
    expect(parsed.format).toBe("csv");
  });

  it("defaults finance groupBy to month", () => {
    expect(financeReportQuerySchema.parse({}).groupBy).toBe("month");
  });

  it("rejects a churchId query on finance reports", () => {
    expect(() =>
      financeReportQuerySchema.parse({
        groupBy: "month",
        churchId: "should-not-be-accepted",
      }),
    ).toThrow();
  });
});
