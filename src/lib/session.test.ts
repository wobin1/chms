import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "./session";

describe("session token", () => {
  it("round-trips userId and a null churchId for Super Admin", async () => {
    const token = await createSessionToken({
      userId: "admin-1",
      churchId: null,
    });
    const payload = await readSessionToken(token);
    expect(payload).toEqual({ userId: "admin-1", churchId: null });
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken({
      userId: "admin-1",
      churchId: null,
    });
    await expect(readSessionToken(`${token}x`)).resolves.toBeNull();
  });
});
