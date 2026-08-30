import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "./errors";

const sermonFindMany = vi.fn();
const sermonCount = vi.fn();
const sermonFindFirst = vi.fn();
const sermonCreate = vi.fn();
const serviceFindFirst = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    sermon: {
      findMany: (...args: unknown[]) => sermonFindMany(...args),
      count: (...args: unknown[]) => sermonCount(...args),
      findFirst: (...args: unknown[]) => sermonFindFirst(...args),
      create: (...args: unknown[]) => sermonCreate(...args),
    },
    service: {
      findFirst: (...args: unknown[]) => serviceFindFirst(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["sermons:manage", "sermons:read"],
};

describe("sermon service isolation", () => {
  beforeEach(() => {
    sermonFindMany.mockReset();
    sermonCount.mockReset();
    sermonFindFirst.mockReset();
    sermonCreate.mockReset();
    serviceFindFirst.mockReset();
  });

  it("lists sermons only for the session church", async () => {
    sermonFindMany.mockResolvedValue([]);
    sermonCount.mockResolvedValue(0);
    const { listSermons } = await import("./sermon-service");
    const result = await listSermons(churchAdmin);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(sermonFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("returns not found for a sermon in another church", async () => {
    sermonFindFirst.mockResolvedValue(null);
    const { getSermon } = await import("./sermon-service");
    await expect(getSermon(churchAdmin, "sermon-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("creates a sermon on a service of this church", async () => {
    serviceFindFirst.mockResolvedValue({ id: "service-a", churchId: "church-a" });
    sermonCreate.mockResolvedValue({ id: "sermon-a" });
    const { createSermon } = await import("./sermon-service");
    await createSermon(churchAdmin, {
      serviceId: "service-a",
      title: "The Good Shepherd",
      preacher: "Rev. Musa",
    });
    expect(sermonCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          churchId: "church-a",
          serviceId: "service-a",
          title: "The Good Shepherd",
          preacher: "Rev. Musa",
        }),
      }),
    );
  });

  it("returns not found when the service belongs to another church", async () => {
    serviceFindFirst.mockResolvedValue(null);
    const { createSermon } = await import("./sermon-service");
    await expect(
      createSermon(churchAdmin, {
        serviceId: "service-b",
        title: "Hope",
        preacher: "Pastor Ada",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(sermonCreate).not.toHaveBeenCalled();
  });

  it("rejects a zone leader creating a sermon", async () => {
    const { createSermon } = await import("./sermon-service");
    await expect(
      createSermon(
        {
          userId: "zl",
          churchId: "church-a",
          permissions: ["members:read", "zones:read"],
        },
        {
          serviceId: "service-a",
          title: "Hope",
          preacher: "Pastor Ada",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
