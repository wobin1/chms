import { describe, expect, it } from "vitest";
import {
  ageOnBirthday,
  birthdayFallsInPeriod,
  birthdayListSocialCaption,
  birthdaySocialCaption,
  endOfIsoWeekUtc,
  shiftCelebrantOn,
  startOfIsoWeekUtc,
} from "./celebrant-rules";

function utcDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe("birthday period matching", () => {
  it("matches a birthday in the selected month regardless of year", () => {
    expect(
      birthdayFallsInPeriod(utcDate("1990-09-12"), "month", utcDate("2026-09-06")),
    ).toBe(true);
    expect(
      birthdayFallsInPeriod(utcDate("1990-08-12"), "month", utcDate("2026-09-06")),
    ).toBe(false);
  });

  it("matches a birthday on the selected day, observing Feb 29 on Feb 28 in non-leap years", () => {
    expect(
      birthdayFallsInPeriod(utcDate("1990-09-06"), "day", utcDate("2026-09-06")),
    ).toBe(true);
    expect(
      birthdayFallsInPeriod(utcDate("1990-09-07"), "day", utcDate("2026-09-06")),
    ).toBe(false);
    expect(
      birthdayFallsInPeriod(utcDate("2000-02-29"), "day", utcDate("2026-02-28")),
    ).toBe(true);
    expect(
      birthdayFallsInPeriod(utcDate("2000-02-29"), "day", utcDate("2024-02-29")),
    ).toBe(true);
  });

  it("matches birthdays that fall in the ISO week of the reference date", () => {
    // 6 Sep 2026 is a Sunday; ISO week is Mon 31 Aug – Sun 6 Sep.
    expect(startOfIsoWeekUtc(utcDate("2026-09-06")).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
    expect(endOfIsoWeekUtc(utcDate("2026-09-06")).toISOString()).toBe(
      "2026-09-06T00:00:00.000Z",
    );
    expect(
      birthdayFallsInPeriod(utcDate("1991-09-02"), "week", utcDate("2026-09-06")),
    ).toBe(true);
    expect(
      birthdayFallsInPeriod(utcDate("1991-09-07"), "week", utcDate("2026-09-06")),
    ).toBe(false);
  });

  it("computes the age the member turns on that birthday in the reference year", () => {
    expect(ageOnBirthday(utcDate("1990-09-12"), utcDate("2026-09-06"))).toBe(36);
  });

  it("moves month, week, and day filters to the next or previous period", () => {
    expect(shiftCelebrantOn("month", "2026-09-06", 1)).toBe("2026-10-01");
    expect(shiftCelebrantOn("month", "2026-12-15", 1)).toBe("2027-01-01");
    expect(shiftCelebrantOn("month", "2026-01-04", -1)).toBe("2025-12-01");
    expect(shiftCelebrantOn("week", "2026-09-06", 1)).toBe("2026-09-07");
    expect(shiftCelebrantOn("week", "2026-09-06", -1)).toBe("2026-08-24");
    expect(shiftCelebrantOn("day", "2026-09-06", 1)).toBe("2026-09-07");
    expect(shiftCelebrantOn("day", "2026-09-01", -1)).toBe("2026-08-31");
  });
});

describe("birthday social captions", () => {
  it("builds a post without phone, email, address, or birth year", () => {
    const caption = birthdaySocialCaption({
      firstName: "Adaeze",
      lastName: "Okonkwo",
      zoneName: "Hope",
      churchName: "ECWA Demo",
    });
    expect(caption).toBe(
      "Happy birthday to Adaeze Okonkwo of Hope! We celebrate you with joy. — ECWA Demo",
    );
    expect(caption).not.toMatch(/1990|@|phone|\d{4}/);
  });

  it("builds a list post for the selected period", () => {
    expect(
      birthdayListSocialCaption({
        churchName: "ECWA Demo",
        period: "month",
        reference: utcDate("2026-09-06"),
        names: ["Adaeze Okonkwo", "John Bello"],
      }),
    ).toContain("September");
    expect(
      birthdayListSocialCaption({
        churchName: "ECWA Demo",
        period: "week",
        reference: utcDate("2026-09-06"),
        names: ["Adaeze Okonkwo"],
      }),
    ).toMatch(/this week/i);
    expect(
      birthdayListSocialCaption({
        churchName: "ECWA Demo",
        period: "day",
        reference: utcDate("2026-09-06"),
        names: ["Adaeze Okonkwo"],
      }),
    ).toMatch(/today/i);
  });
});
