import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "./errors";

const visitorFindFirst = vi.fn();
const serviceFindFirst = vi.fn();
const visitCreate = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    visitor: {
      findFirst: (...args: unknown[]) => visitorFindFirst(...args),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    service: {
      findFirst: (...args: unknown[]) => serviceFindFirst(...args),
    },
    visitorVisit: {
      create: (...args: unknown[]) => visitCreate(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./member-service", () => ({
  createMember: vi.fn(),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["visitors:manage", "visitors:read", "members:manage"],
};

describe("visitor visit isolation", () => {
  beforeEach(() => {
    visitorFindFirst.mockReset();
    serviceFindFirst.mockReset();
    visitCreate.mockReset();
  });

  it("rejects linking a visit to another church's service", async () => {
    visitorFindFirst.mockResolvedValue({
      id: "visitor-a",
      churchId: "church-a",
      status: "NEW",
    });
    serviceFindFirst.mockResolvedValue(null);
    const { addVisitorVisit } = await import("./visitor-service");
    await expect(
      addVisitorVisit(churchAdmin, "visitor-a", {
        serviceId: "service-b",
        visitDate: new Date("2026-08-29"),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(visitCreate).not.toHaveBeenCalled();
  });

  it("returns not found for a visitor in another church", async () => {
    visitorFindFirst.mockResolvedValue(null);
    const { getVisitor } = await import("./visitor-service");
    await expect(getVisitor(churchAdmin, "visitor-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
