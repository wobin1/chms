import { describe, expect, it } from "vitest";
import { signUploadParams } from "./cloudinary";

describe("cloudinary signed upload", () => {
  it("returns a signature and never includes the API secret", () => {
    const signed = signUploadParams({
      churchId: "church-a",
      entity: "members",
      entityId: "member-1",
    });

    expect(signed.folder).toBe("chms/church-a/members/member-1");
    expect(signed.signature).toMatch(/^[a-f0-9]{40}$/);
    expect(signed.apiKey).toBe("test-key");
    expect(signed.cloudName).toBe("test-cloud");
    expect(JSON.stringify(signed)).not.toContain("test-secret");
    expect(signed).not.toHaveProperty("apiSecret");
    expect(signed).not.toHaveProperty("api_secret");
  });
});
