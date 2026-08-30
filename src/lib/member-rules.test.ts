import { describe, expect, it } from "vitest";
import { assertMemberBelongsToChurch, assertZoneBelongsToChurch } from "./member-rules";
import { NotFoundError } from "./errors";

describe("assertZoneBelongsToChurch", () => {
  it("allows a zone of the same church", () => {
    expect(() =>
      assertZoneBelongsToChurch(
        { id: "z1", churchId: "church-a" },
        "church-a",
      ),
    ).not.toThrow();
  });

  it("hides a zone from another church as not found", () => {
    expect(() =>
      assertZoneBelongsToChurch(
        { id: "z1", churchId: "church-b" },
        "church-a",
      ),
    ).toThrow(NotFoundError);
  });
});

describe("assertMemberBelongsToChurch", () => {
  it("allows a member of the same church", () => {
    expect(() =>
      assertMemberBelongsToChurch(
        { id: "m1", churchId: "church-a" },
        "church-a",
      ),
    ).not.toThrow();
  });

  it("hides a member from another church as not found", () => {
    expect(() =>
      assertMemberBelongsToChurch(
        { id: "m1", churchId: "church-b" },
        "church-a",
      ),
    ).toThrow(NotFoundError);
  });

  it("hides a missing member as not found", () => {
    expect(() => assertMemberBelongsToChurch(null, "church-a")).toThrow(
      NotFoundError,
    );
  });
});
