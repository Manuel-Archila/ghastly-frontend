import { describe, expect, it } from "vitest";
import { monthlyEquivalentCents, nextOccurrence, RecurrenceError } from "./recurrence";

describe("nextOccurrence", () => {
  it("monthly advances one month, clamping at month-end", () => {
    expect(nextOccurrence("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextOccurrence("2026-09-05", "monthly")).toBe("2026-10-05");
  });

  it("weekly/daily add plain days", () => {
    expect(nextOccurrence("2026-09-05", "weekly")).toBe("2026-09-12");
    expect(nextOccurrence("2026-09-05", "daily")).toBe("2026-09-06");
  });

  it("quarterly/yearly use the month step", () => {
    expect(nextOccurrence("2026-01-15", "quarterly")).toBe("2026-04-15");
    expect(nextOccurrence("2026-01-15", "yearly")).toBe("2027-01-15");
  });

  it("respects interval > 1", () => {
    expect(nextOccurrence("2026-01-15", "monthly", 2)).toBe("2026-03-15");
    expect(nextOccurrence("2026-09-05", "weekly", 2)).toBe("2026-09-19");
  });

  it("repeated calls project a full future series (calendario)", () => {
    let d = "2026-09-27";
    const series = [];
    for (let i = 0; i < 3; i++) {
      d = nextOccurrence(d, "monthly");
      series.push(d);
    }
    expect(series).toEqual(["2026-10-27", "2026-11-27", "2026-12-27"]);
  });

  it("rejects interval <= 0", () => {
    expect(() => nextOccurrence("2026-01-01", "monthly", 0)).toThrow(RecurrenceError);
  });
});

describe("monthlyEquivalentCents", () => {
  it("normalizes weekly to a monthly figure", () => {
    expect(monthlyEquivalentCents(1000, "weekly")).toBe(4345);
  });

  it("monthly is unchanged", () => {
    expect(monthlyEquivalentCents(5000, "monthly")).toBe(5000);
  });

  it("yearly divides by 12", () => {
    expect(monthlyEquivalentCents(120000, "yearly")).toBe(10000);
  });
});
