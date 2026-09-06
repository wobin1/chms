import { describe, expect, it } from "vitest";
import {
  familyMemberSchema,
  familyMembersWriteSchema,
  familySchema,
  parseFamilyMemberWrite,
  updateFamilySchema,
} from "./schema";

const memberA = "11111111-1111-4111-8111-111111111111";
const memberB = "22222222-2222-4222-8222-222222222222";

describe("family member write schema", () => {
  it("accepts Head, Spouse, Child, or other text", () => {
    expect(
      familyMemberSchema.parse({ memberId: memberA, relationship: "Head" })
        .relationship,
    ).toBe("Head");
    expect(
      familyMemberSchema.parse({ memberId: memberA, relationship: "Spouse" })
        .relationship,
    ).toBe("Spouse");
    expect(
      familyMemberSchema.parse({ memberId: memberA, relationship: "Child" })
        .relationship,
    ).toBe("Child");
    expect(
      familyMemberSchema.parse({ memberId: memberA, relationship: "Uncle" })
        .relationship,
    ).toBe("Uncle");
  });

  it("accepts several members with one relationship", () => {
    const parsed = familyMembersWriteSchema.parse({
      memberIds: [memberA, memberB],
      relationship: "Child",
    });
    expect(parsed.memberIds).toHaveLength(2);
  });

  it("normalizes a single member or a batch into the same shape", () => {
    expect(
      parseFamilyMemberWrite({ memberId: memberA, relationship: "Head" }),
    ).toEqual({
      members: [{ memberId: memberA, relationship: "Head" }],
    });
    expect(
      parseFamilyMemberWrite({
        memberIds: [memberA, memberB],
        relationship: "Child",
      }),
    ).toEqual({
      members: [
        { memberId: memberA, relationship: "Child" },
        { memberId: memberB, relationship: "Child" },
      ],
    });
  });

  it("rejects an empty relationship", () => {
    expect(() =>
      familyMemberSchema.parse({ memberId: memberA, relationship: "" }),
    ).toThrow();
  });
});

describe("family write schema", () => {
  const zoneId = "33333333-3333-4333-8333-333333333333";

  it("requires a zone", () => {
    expect(() => familySchema.parse({ name: "Adewale" })).toThrow();
    expect(familySchema.parse({ name: "Adewale", zoneId }).zoneId).toBe(zoneId);
  });

  it("accepts familyOfTheWeek as a boolean", () => {
    expect(updateFamilySchema.parse({ familyOfTheWeek: true })).toEqual({
      familyOfTheWeek: true,
    });
    expect(updateFamilySchema.parse({ familyOfTheWeek: false })).toEqual({
      familyOfTheWeek: false,
    });
  });

  it("rejects a non-boolean familyOfTheWeek", () => {
    expect(() =>
      updateFamilySchema.parse({ familyOfTheWeek: "true" }),
    ).toThrow();
  });
});
