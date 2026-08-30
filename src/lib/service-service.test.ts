import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "./errors";

const serviceFindFirst = vi.fn();
const attendanceUpsert = vi.fn();
const categoryFindMany = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    service: {
      findFirst: (...args: unknown[]) => serviceFindFirst(...args),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    serviceAttendance: {
      upsert: (...args: unknown[]) => attendanceUpsert(...args),
    },
    attendanceCategory: {
      findMany: (...args: unknown[]) => categoryFindMany(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["services:read", "attendance:manage"],
};

describe("service attendance isolation", () => {
  beforeEach(() => {
    serviceFindFirst.mockReset();
    attendanceUpsert.mockReset();
    categoryFindMany.mockReset();
  });

  it("returns not found for a service in another church", async () => {
    serviceFindFirst.mockResolvedValue(null);
    const { getService } = await import("./service-service");
    await expect(getService(churchAdmin, "service-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("does not save attendance for another church's service", async () => {
    serviceFindFirst.mockResolvedValue(null);
    const { saveServiceAttendance } = await import("./service-service");
    await expect(
      saveServiceAttendance(churchAdmin, "service-b", {
        items: [
          {
            attendanceCategoryId: "11111111-1111-4111-8111-111111111111",
            count: 10,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(attendanceUpsert).not.toHaveBeenCalled();
  });

  it("rejects two counts for the same category on one service", async () => {
    serviceFindFirst.mockResolvedValue({
      id: "service-a",
      churchId: "church-a",
    });
    categoryFindMany.mockResolvedValue([
      { id: "11111111-1111-4111-8111-111111111111", churchId: "church-a" },
    ]);
    const { saveServiceAttendance } = await import("./service-service");
    await expect(
      saveServiceAttendance(churchAdmin, "service-a", {
        items: [
          {
            attendanceCategoryId: "11111111-1111-4111-8111-111111111111",
            count: 10,
          },
          {
            attendanceCategoryId: "11111111-1111-4111-8111-111111111111",
            count: 12,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(attendanceUpsert).not.toHaveBeenCalled();
  });
});
