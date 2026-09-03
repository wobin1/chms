import { describe, expect, it } from "vitest";
import {
  formatMemberLabel,
  memberPickerSearchUrl,
  mergeMemberOptions,
  toggleMemberId,
} from "./member-option";

const ada = {
  id: "a",
  firstName: "Ada",
  lastName: "Adewale",
  membershipNumber: "M-1",
};
const tomi = {
  id: "b",
  firstName: "Tomi",
  lastName: "Bello",
  membershipNumber: "M-2",
};

describe("member picker helpers", () => {
  it("formats a searchable member label with name and number", () => {
    expect(formatMemberLabel(ada)).toBe("Adewale, Ada (M-1)");
  });

  it("searches members by query instead of dumping the full list", () => {
    expect(memberPickerSearchUrl("ade")).toBe(
      "/api/v1/members?page=1&pageSize=20&q=ade",
    );
    expect(memberPickerSearchUrl("  ")).toBe(
      "/api/v1/members?page=1&pageSize=20",
    );
  });

  it("toggles members for family multi-select", () => {
    expect(toggleMemberId([], "a")).toEqual(["a"]);
    expect(toggleMemberId(["a", "b"], "a")).toEqual(["b"]);
  });

  it("keeps already selected members visible while searching", () => {
    const merged = mergeMemberOptions([tomi], [ada]);
    expect(merged.map((row) => row.id)).toEqual(["b", "a"]);
  });
});
