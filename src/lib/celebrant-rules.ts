export type CelebrantPeriod = "month" | "week" | "day";

function utcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function startOfIsoWeekUtc(date: Date) {
  const start = new Date(utcDay(date));
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diff);
  return start;
}

export function endOfIsoWeekUtc(date: Date) {
  const start = startOfIsoWeekUtc(date);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6));
}

export function birthdayOnCalendarYear(dateOfBirth: Date, year: number) {
  const month = dateOfBirth.getUTCMonth();
  const day = dateOfBirth.getUTCDate();
  if (month === 1 && day === 29 && !isLeapYear(year)) {
    return new Date(Date.UTC(year, 1, 28));
  }
  return new Date(Date.UTC(year, month, day));
}

export function birthdayFallsInPeriod(
  dateOfBirth: Date,
  period: CelebrantPeriod,
  reference: Date,
) {
  if (period === "month") {
    return dateOfBirth.getUTCMonth() === reference.getUTCMonth();
  }
  if (period === "day") {
    const observed = birthdayOnCalendarYear(dateOfBirth, reference.getUTCFullYear());
    return utcDay(observed) === utcDay(reference);
  }
  const start = startOfIsoWeekUtc(reference);
  const end = endOfIsoWeekUtc(reference);
  const years = new Set([start.getUTCFullYear(), end.getUTCFullYear()]);
  for (const year of years) {
    const observed = birthdayOnCalendarYear(dateOfBirth, year);
    if (utcDay(observed) >= utcDay(start) && utcDay(observed) <= utcDay(end)) {
      return true;
    }
  }
  return false;
}

export function periodRangeUtc(period: CelebrantPeriod, reference: Date) {
  if (period === "month") {
    const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
    const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0));
    return { from: start, to: end };
  }
  if (period === "week") {
    return { from: startOfIsoWeekUtc(reference), to: endOfIsoWeekUtc(reference) };
  }
  const day = new Date(utcDay(reference));
  return { from: day, to: day };
}

export function ageOnBirthday(dateOfBirth: Date, reference: Date) {
  return reference.getUTCFullYear() - dateOfBirth.getUTCFullYear();
}

export function formatBirthdayDay(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function shiftCelebrantOn(
  period: CelebrantPeriod,
  on: string,
  direction: 1 | -1,
) {
  const reference = new Date(`${on}T00:00:00.000Z`);
  if (Number.isNaN(reference.getTime())) {
    return on;
  }
  if (period === "month") {
    return toIsoDate(
      new Date(
        Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + direction, 1),
      ),
    );
  }
  if (period === "week") {
    const start = startOfIsoWeekUtc(reference);
    start.setUTCDate(start.getUTCDate() + direction * 7);
    return toIsoDate(start);
  }
  const day = new Date(utcDay(reference));
  day.setUTCDate(day.getUTCDate() + direction);
  return toIsoDate(day);
}

export function todayUtcIso() {
  return toIsoDate(new Date());
}

export function birthdaySocialCaption(input: {
  firstName: string;
  lastName: string;
  zoneName?: string | null;
  churchName: string;
}) {
  const who = `${input.firstName} ${input.lastName}`.trim();
  const zone = input.zoneName?.trim();
  if (zone) {
    return `Happy birthday to ${who} of ${zone}! We celebrate you with joy. — ${input.churchName}`;
  }
  return `Happy birthday to ${who}! We celebrate you with joy. — ${input.churchName}`;
}

function joinNames(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function periodLeadIn(period: CelebrantPeriod, reference: Date) {
  if (period === "month") {
    const month = new Intl.DateTimeFormat("en-GB", {
      month: "long",
      timeZone: "UTC",
    }).format(reference);
    return `This ${month} we celebrate`;
  }
  if (period === "week") {
    return "This week we celebrate";
  }
  return "Today we celebrate";
}

export function birthdayListSocialCaption(input: {
  churchName: string;
  period: CelebrantPeriod;
  reference: Date;
  names: string[];
}) {
  if (input.names.length === 0) {
    return `No birthday celebrants to share from ${input.churchName} right now.`;
  }
  return `${periodLeadIn(input.period, input.reference)} ${joinNames(input.names)}. Happy birthday from ${input.churchName}!`;
}
