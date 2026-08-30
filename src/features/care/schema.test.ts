import { describe, expect, it } from "vitest";
import { pastoralCaseWriteSchema, prayerRequestWriteSchema } from "./schema";

const memberId = "11111111-1111-4111-8111-111111111111";

describe("pastoral and prayer schemas", () => {
  it("requires a member, title, and case type on a pastoral case", () => {
    const parsed = pastoralCaseWriteSchema.parse({
      memberId,
      caseType: "Counselling",
      title: "Hospital follow-up",
    });
    expect(parsed.memberId).toBe(memberId);
    expect(parsed.priority).toBeUndefined();
  });

  it("rejects a churchId on a pastoral case payload", () => {
    expect(() =>
      pastoralCaseWriteSchema.parse({
        memberId,
        caseType: "Bereavement",
        title: "Visit",
        churchId: "should-not-be-accepted",
      }),
    ).toThrow();
  });

  it("allows a prayer request without a member", () => {
    const parsed = prayerRequestWriteSchema.parse({
      title: "Healing for Ada",
      description: "Surgery next week",
    });
    expect(parsed.memberId).toBeUndefined();
  });

  it("rejects a churchId on a prayer request payload", () => {
    expect(() =>
      prayerRequestWriteSchema.parse({
        title: "Healing",
        churchId: "should-not-be-accepted",
      }),
    ).toThrow();
  });
});
