import { describe, expect, it } from "vitest";
import { loginSchema } from "@/features/auth/schema";

describe("loginSchema", () => {
  it("rejects unknown fields", () => {
    const parsed = loginSchema.safeParse({
      email: "admin@chms.local",
      password: "secret",
      churchId: "other-church",
    });
    expect(parsed.success).toBe(false);
  });
});
