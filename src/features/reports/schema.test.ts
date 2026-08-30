import { describe, expect, it } from "vitest";
import { attendanceReportQuerySchema } from "./schema";

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
});
