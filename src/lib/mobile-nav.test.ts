import { describe, expect, it } from "vitest";
import { MOBILE_NAV_MEDIA_QUERY, sidebarUsesIconOnly } from "./mobile-nav";

describe("mobile nav", () => {
  it("treats viewports below Tailwind md as the hamburger drawer", () => {
    expect(MOBILE_NAV_MEDIA_QUERY).toBe("(max-width: 767px)");
  });

  it("keeps labels visible when the mobile drawer is open", () => {
    expect(sidebarUsesIconOnly(true, true)).toBe(false);
    expect(sidebarUsesIconOnly(true, false)).toBe(true);
    expect(sidebarUsesIconOnly(false, false)).toBe(false);
  });
});
