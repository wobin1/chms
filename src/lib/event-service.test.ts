import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";

const eventFindMany = vi.fn();
const eventCount = vi.fn();
const eventFindFirst = vi.fn();
const eventCreate = vi.fn();
const attendanceUpsert = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    event: {
      findMany: (...args: unknown[]) => eventFindMany(...args),
      count: (...args: unknown[]) => eventCount(...args),
      findFirst: (...args: unknown[]) => eventFindFirst(...args),
      create: (...args: unknown[]) => eventCreate(...args),
    },
    eventAttendance: {
      upsert: (...args: unknown[]) => attendanceUpsert(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["events:manage", "events:read"],
};

describe("event service isolation", () => {
  beforeEach(() => {
    eventFindMany.mockReset();
    eventCount.mockReset();
    eventFindFirst.mockReset();
    eventCreate.mockReset();
    attendanceUpsert.mockReset();
  });

  it("lists events only for the session church", async () => {
    eventFindMany.mockResolvedValue([]);
    eventCount.mockResolvedValue(0);
    const { listEvents } = await import("./event-service");
    const result = await listEvents(churchAdmin);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("returns not found for an event in another church", async () => {
    eventFindFirst.mockResolvedValue(null);
    const { getEvent } = await import("./event-service");
    await expect(getEvent(churchAdmin, "event-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("creates an event with dates and location for this church", async () => {
    eventCreate.mockResolvedValue({ id: "event-a" });
    const { createEvent } = await import("./event-service");
    await createEvent(churchAdmin, {
      name: "Youth Camp",
      eventType: "Camp",
      startDate: new Date("2026-09-12"),
      endDate: new Date("2026-09-14"),
      location: "Jos",
    });
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          churchId: "church-a",
          name: "Youth Camp",
          location: "Jos",
        }),
      }),
    );
  });

  it("rejects recording attendance on another church's event", async () => {
    eventFindFirst.mockResolvedValue(null);
    const { saveEventAttendance } = await import("./event-service");
    await expect(
      saveEventAttendance(churchAdmin, "event-b", { attendanceCount: 40 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(attendanceUpsert).not.toHaveBeenCalled();
  });

  it("rejects a negative event attendance count", async () => {
    eventFindFirst.mockResolvedValue({
      id: "event-a",
      churchId: "church-a",
    });
    const { saveEventAttendance } = await import("./event-service");
    await expect(
      saveEventAttendance(churchAdmin, "event-a", { attendanceCount: -1 }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(attendanceUpsert).not.toHaveBeenCalled();
  });

  it("saves an aggregate count with no member list", async () => {
    eventFindFirst.mockResolvedValue({
      id: "event-a",
      churchId: "church-a",
    });
    attendanceUpsert.mockResolvedValue({ attendanceCount: 40 });
    const { saveEventAttendance } = await import("./event-service");
    await saveEventAttendance(churchAdmin, "event-a", { attendanceCount: 40 });
    expect(attendanceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          eventId: "event-a",
          attendanceCount: 40,
        }),
        update: { attendanceCount: 40 },
      }),
    );
  });

  it("rejects a zone leader creating an event", async () => {
    const { createEvent } = await import("./event-service");
    await expect(
      createEvent(
        {
          userId: "zl",
          churchId: "church-a",
          permissions: ["members:read", "zones:read"],
        },
        {
          name: "Youth Camp",
          eventType: "Camp",
          startDate: new Date("2026-09-12"),
          endDate: new Date("2026-09-14"),
          location: "Jos",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
