import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeAuditLog } from "./audit";

const create = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    auditLog: {
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

describe("writeAuditLog", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: "log-1" });
  });

  it("stores platform actions with a null churchId", async () => {
    await writeAuditLog({
      churchId: null,
      userId: "admin-1",
      action: "password.change",
      entityType: "user",
      entityId: "admin-1",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        churchId: null,
        userId: "admin-1",
        action: "password.change",
        entityType: "user",
        entityId: "admin-1",
      }),
    });
  });
});
