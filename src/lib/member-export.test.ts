import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "./errors";

const memberFindMany = vi.fn();
const listAssignedZoneIds = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    member: {
      findMany: (...args: unknown[]) => memberFindMany(...args),
    },
  },
}));

vi.mock("./zone-service", () => ({
  listAssignedZoneIds: (...args: unknown[]) => listAssignedZoneIds(...args),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["members:manage", "members:read", "members:export"],
};

const churchAdminNoExport = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["members:manage", "members:read"],
};

describe("member CSV export", () => {
  beforeEach(() => {
    memberFindMany.mockReset().mockResolvedValue([]);
    listAssignedZoneIds.mockReset().mockResolvedValue([]);
  });

  it("requires members:export", async () => {
    const { exportMembersCsv } = await import("./member-service");
    await expect(exportMembersCsv(churchAdminNoExport)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(memberFindMany).not.toHaveBeenCalled();
  });

  it("scopes the export to the session church", async () => {
    const { exportMembersCsv } = await import("./member-service");
    await exportMembersCsv(churchAdmin);
    expect(memberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          deletedAt: null,
        }),
      }),
    );
  });

  it("does not include notes in the CSV", async () => {
    memberFindMany.mockResolvedValue([
      {
        membershipNumber: "A-1",
        firstName: "Ada",
        lastName: "Okeke",
        phone: "0801",
        email: "ada@church-a.example",
        notes: "pastoral secret",
        zone: { name: "Hope" },
        membershipStatus: { name: "Active" },
      },
    ]);
    const { exportMembersCsv } = await import("./member-service");
    const csv = await exportMembersCsv(churchAdmin);
    expect(csv).toContain("Ada");
    expect(csv).toContain("Hope");
    expect(csv).not.toContain("pastoral secret");
  });
});
