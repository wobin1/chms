import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";

const announcementFindMany = vi.fn();
const announcementCount = vi.fn();
const announcementFindFirst = vi.fn();
const announcementCreate = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    announcement: {
      findMany: (...args: unknown[]) => announcementFindMany(...args),
      count: (...args: unknown[]) => announcementCount(...args),
      findFirst: (...args: unknown[]) => announcementFindFirst(...args),
      create: (...args: unknown[]) => announcementCreate(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["announcements:manage", "announcements:read"],
};

describe("announcement service isolation", () => {
  beforeEach(() => {
    announcementFindMany.mockReset();
    announcementCount.mockReset();
    announcementFindFirst.mockReset();
    announcementCreate.mockReset();
  });

  it("lists announcements only for the session church", async () => {
    announcementFindMany.mockResolvedValue([]);
    announcementCount.mockResolvedValue(0);
    const { listAnnouncements } = await import("./announcement-service");
    const result = await listAnnouncements(churchAdmin);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(announcementFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("returns not found for an announcement in another church", async () => {
    announcementFindFirst.mockResolvedValue(null);
    const { getAnnouncement } = await import("./announcement-service");
    await expect(
      getAnnouncement(churchAdmin, "announcement-b"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("creates an announcement with start and end dates for this church", async () => {
    announcementCreate.mockResolvedValue({ id: "announcement-a" });
    const { createAnnouncement } = await import("./announcement-service");
    await createAnnouncement(churchAdmin, {
      title: "Youth Sunday",
      content: "Wear blue.",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-07"),
    });
    expect(announcementCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          churchId: "church-a",
          title: "Youth Sunday",
          createdById: "user-a",
        }),
      }),
    );
  });

  it("rejects an end date before the start date", async () => {
    const { createAnnouncement } = await import("./announcement-service");
    await expect(
      createAnnouncement(churchAdmin, {
        title: "Youth Sunday",
        content: "Wear blue.",
        startDate: new Date("2026-09-07"),
        endDate: new Date("2026-09-01"),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(announcementCreate).not.toHaveBeenCalled();
  });

  it("rejects a zone leader creating an announcement", async () => {
    const { createAnnouncement } = await import("./announcement-service");
    await expect(
      createAnnouncement(
        {
          userId: "zl",
          churchId: "church-a",
          permissions: ["members:read", "zones:read"],
        },
        {
          title: "Youth Sunday",
          content: "Wear blue.",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-09-07"),
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
