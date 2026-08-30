import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("ChangeMe!admin1");
    expect(hash).not.toBe("ChangeMe!admin1");
    await expect(verifyPassword("ChangeMe!admin1", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("ChangeMe!admin1");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
