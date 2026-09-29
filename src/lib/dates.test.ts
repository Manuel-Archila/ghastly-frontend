import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  addMonthsClamped,
  clampDay,
  daysBetween,
  formatDateLabel,
  formatMonthLabel,
  todayIso,
} from "./dates";

describe("clampDay", () => {
  it("returns the exact day when the month has it", () => {
    expect(clampDay(2026, 1, 15)).toBe("2026-01-15");
  });
  it("clamps to the last day of a short month", () => {
    expect(clampDay(2026, 2, 31)).toBe("2026-02-28");
    expect(clampDay(2028, 2, 31)).toBe("2028-02-29");
  });
});

describe("addMonthsClamped", () => {
  it("simple case", () => {
    expect(addMonthsClamped("2026-01-15", 1)).toBe("2026-02-15");
  });
  it("end of month: 31 jan + 1 month", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
  });
  it("crosses year boundary", () => {
    expect(addMonthsClamped("2026-11-30", 2)).toBe("2027-01-30");
  });
  it("negative months", () => {
    expect(addMonthsClamped("2026-03-31", -1)).toBe("2026-02-28");
  });
});

describe("addDays / daysBetween", () => {
  it("adds days across month boundary", () => {
    expect(addDays("2026-01-30", 5)).toBe("2026-02-04");
  });
  it("counts days between", () => {
    expect(daysBetween("2026-09-01", "2026-09-15")).toBe(14);
  });
});

describe("todayIso", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
    vi.useRealTimers();
  });

  it("uses the device's local calendar date, not UTC's", () => {
    // 01:30 UTC del 28 de sept. es todavía 27 de sept., 19:30, en Guatemala
    // (UTC-6) — el bug real: toISOString() habría devuelto "2026-09-28".
    process.env.TZ = "America/Guatemala";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T01:30:00Z"));
    expect(todayIso()).toBe("2026-09-27");
  });
});

describe("formatMonthLabel", () => {
  it("capitalizes the Spanish month name", () => {
    expect(formatMonthLabel("2026-09")).toBe("Septiembre 2026");
    expect(formatMonthLabel("2026-01")).toBe("Enero 2026");
  });
  it("accepts a full ISO date", () => {
    expect(formatMonthLabel("2026-12-31")).toBe("Diciembre 2026");
  });
  it("returns the input untouched when it cannot parse", () => {
    expect(formatMonthLabel("basura")).toBe("basura");
    expect(formatMonthLabel("2026-13")).toBe("2026-13");
  });
});

describe("formatDateLabel", () => {
  it("formats day, short month and year", () => {
    expect(formatDateLabel("2026-09-29")).toBe("29 sep 2026");
    expect(formatDateLabel("2026-03-05")).toBe("5 mar 2026");
  });
  it("returns the input untouched when it cannot parse", () => {
    expect(formatDateLabel("mañana")).toBe("mañana");
  });
});
