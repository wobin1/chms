import { describe, expect, it } from "vitest";
import { attendanceWriteSchema } from "./schema";

const categoryId = "11111111-1111-4111-8111-111111111111";

describe("attendanceWriteSchema", () => {
  it("accepts non-negative integer counts per category", () => {
    expect(
      attendanceWriteSchema.parse({
        items: [{ attendanceCategoryId: categoryId, count: 0 }],
      }),
    ).toEqual({
      items: [{ attendanceCategoryId: categoryId, count: 0 }],
    });
  });

  it("rejects negative counts", () => {
    expect(() =>
      attendanceWriteSchema.parse({
        items: [{ attendanceCategoryId: categoryId, count: -1 }],
      }),
    ).toThrow();
  });

  it("rejects a member id on the attendance payload", () => {
    expect(() =>
      attendanceWriteSchema.parse({
        memberId: "22222222-2222-4222-8222-222222222222",
        items: [{ attendanceCategoryId: categoryId, count: 10 }],
      }),
    ).toThrow();
  });

  it("rejects a member id on a count row", () => {
    expect(() =>
      attendanceWriteSchema.parse({
        items: [
          {
            attendanceCategoryId: categoryId,
            count: 10,
            memberId: "22222222-2222-4222-8222-222222222222",
          },
        ],
      }),
    ).toThrow();
  });
});
