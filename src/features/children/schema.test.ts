import { describe, expect, it } from "vitest";
import { childGuardianSchema, childWriteSchema } from "./schema";

describe("child schemas", () => {
  it("requires a family in this church and allows two guardians", () => {
    const parsed = childWriteSchema.parse({
      familyId: "11111111-1111-4111-8111-111111111111",
      firstName: "Tomi",
      lastName: "Adewale",
      guardians: [
        {
          memberId: "22222222-2222-4222-8222-222222222222",
          relationship: "Mother",
        },
        {
          memberId: "33333333-3333-4333-8333-333333333333",
          relationship: "Father",
        },
      ],
    });
    expect(parsed.guardians).toHaveLength(2);
  });

  it("rejects unknown fields", () => {
    expect(() =>
      childWriteSchema.parse({
        familyId: "11111111-1111-4111-8111-111111111111",
        firstName: "Tomi",
        lastName: "Adewale",
        churchId: "should-not-be-accepted",
      }),
    ).toThrow();
  });

  it("requires a member id for a guardian", () => {
    expect(() =>
      childGuardianSchema.parse({ relationship: "Mother" }),
    ).toThrow();
  });
});
