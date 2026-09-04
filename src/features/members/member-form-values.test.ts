import { describe, expect, it } from "vitest";
import {
  emptyMemberForm,
  memberFormClientError,
  memberFormFromRecord,
  memberFormPayload,
} from "./member-form-values";

describe("member form values", () => {
  it("defaults gender and empty demographics for a new member", () => {
    const form = emptyMemberForm();
    expect(form.gender).toBe("UNSPECIFIED");
    expect(form.middleName).toBe("");
    expect(form.dateOfBirth).toBe("");
    expect(form.state).toBe("");
    expect(form.occupation).toBe("");
    expect(form.maritalStatus).toBe("");
    expect(form.notes).toBe("");
  });

  it("hydrates demographics from an existing member record", () => {
    const form = memberFormFromRecord({
      membershipNumber: "M-12",
      firstName: "Ada",
      middleName: "Chioma",
      lastName: "Adewale",
      gender: "FEMALE",
      dateOfBirth: "1990-04-12T00:00:00.000Z",
      phone: "08031234567",
      email: "ada@example.com",
      address: "12 Unity Rd",
      city: "Lagos",
      state: "Lagos",
      occupation: "Teacher",
      maritalStatus: "Married",
      dateJoined: "2020-01-05T00:00:00.000Z",
      membershipStatusId: "11111111-1111-1111-1111-111111111111",
      zoneId: "22222222-2222-2222-2222-222222222222",
      photoUrl: null,
      photoPublicId: null,
      notes: "Choir",
    });

    expect(form.middleName).toBe("Chioma");
    expect(form.gender).toBe("FEMALE");
    expect(form.dateOfBirth).toBe("1990-04-12");
    expect(form.state).toBe("Lagos");
    expect(form.occupation).toBe("Teacher");
    expect(form.maritalStatus).toBe("Married");
    expect(form.notes).toBe("Choir");
  });

  it("includes gender and demographics in the API payload", () => {
    const payload = memberFormPayload({
      ...emptyMemberForm(),
      membershipNumber: "M-12",
      firstName: "Ada",
      middleName: "Chioma",
      lastName: "Adewale",
      gender: "FEMALE",
      dateOfBirth: "1990-04-12",
      phone: "08031234567",
      email: "ada@example.com",
      address: "12 Unity Rd",
      city: "Lagos",
      state: "Lagos",
      occupation: "Teacher",
      maritalStatus: "Married",
      dateJoined: "2020-01-05",
      membershipStatusId: "11111111-1111-1111-1111-111111111111",
      zoneId: "22222222-2222-2222-2222-222222222222",
      notes: "Choir",
    });

    expect(payload).toMatchObject({
      middleName: "Chioma",
      gender: "FEMALE",
      dateOfBirth: "1990-04-12",
      state: "Lagos",
      occupation: "Teacher",
      maritalStatus: "Married",
      notes: "Choir",
    });
  });

  it("does not put family on the write payload (assigned from Families)", () => {
    const payload = memberFormPayload(emptyMemberForm());
    expect(payload).not.toHaveProperty("familyId");
    expect(payload).not.toHaveProperty("family");
  });
});

describe("memberFormClientError", () => {
  it("requires a membership status before save", () => {
    expect(
      memberFormClientError({
        ...emptyMemberForm(),
        membershipNumber: "M-1",
        firstName: "Ada",
        lastName: "Okeke",
        membershipStatusId: "",
      }),
    ).toBe("Choose a membership status.");
  });

  it("returns null when required fields are present", () => {
    expect(
      memberFormClientError({
        ...emptyMemberForm(),
        membershipNumber: "M-1",
        firstName: "Ada",
        lastName: "Okeke",
        membershipStatusId: "11111111-1111-1111-1111-111111111111",
      }),
    ).toBeNull();
  });
});
