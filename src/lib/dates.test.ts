import { describe, expect, it } from "vitest";
import { addDays, addMonthsClamped, clampDay, daysBetween } from "./dates";

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
