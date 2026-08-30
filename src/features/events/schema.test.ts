import { describe, expect, it } from "vitest";
import { eventAttendanceWriteSchema, eventWriteSchema } from "./schema";

describe("event schemas", () => {
  it("requires name, type, dates, and location", () => {
    const parsed = eventWriteSchema.parse({
      name: "Youth Camp",
      eventType: "Camp",
      startDate: "2026-09-12",
      endDate: "2026-09-14",
      location: "Jos",
    });
    expect(parsed.location).toBe("Jos");
  });

  it("rejects a member id on the event attendance payload", () => {
    expect(() =>
      eventAttendanceWriteSchema.parse({
        attendanceCount: 40,
        memberId: "22222222-2222-4222-8222-222222222222",
      }),
    ).toThrow();
  });

  it("rejects a negative event attendance count", () => {
    expect(() =>
      eventAttendanceWriteSchema.parse({ attendanceCount: -1 }),
    ).toThrow();
  });
});
