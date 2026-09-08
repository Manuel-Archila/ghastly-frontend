import { describe, expect, it } from "vitest";
import {
  computeItemProgress,
  computeRolloverOut,
  expectedIncome,
  projectPeriodEnd,
  suggestedDailyPace,
} from "./budget";

describe("computeItemProgress", () => {
  it("basic case", () => {
    const p = computeItemProgress({ budgetedCents: 2_500, spentCents: 2_140 });
    expect(p.availableCents).toBe(360);
    expect(p.percentConsumed).toBe(86);
  });

  it("overspent shows negative available and >100%", () => {
    const p = computeItemProgress({ budgetedCents: 1_200, spentCents: 1_280 });
    expect(p.availableCents).toBe(-80);
    expect(p.percentConsumed).toBe(107);
  });

  it("rollover counts in the denominator", () => {
    const p = computeItemProgress({ budgetedCents: 800, spentCents: 340, rolloverInCents: 120 });
    expect(p.percentConsumed).toBe(37);
    expect(p.availableCents).toBe(580);
  });
});

describe("projectPeriodEnd", () => {
  it("extrapolates the daily rate", () => {
    expect(projectPeriodEnd(214_000, 18, 30)).toBe(356_667);
  });

  it("returns spent as-is when no days elapsed", () => {
    expect(projectPeriodEnd(500, 0, 30)).toBe(500);
  });
});

describe("suggestedDailyPace", () => {
  it("splits available over remaining days", () => {
    expect(suggestedDailyPace(360, 12)).toBe(30);
  });
});

describe("computeRolloverOut", () => {
  it("carries surplus only when enabled", () => {
    expect(computeRolloverOut(580, true)).toBe(580);
    expect(computeRolloverOut(580, false)).toBe(0);
    expect(computeRolloverOut(-200, true)).toBe(0);
  });
});

describe("expectedIncome", () => {
  it("picks by basis", () => {
    const p = { fixedCents: 500_000, previousMonthCents: 480_000, avg3mCents: 470_000 };
    expect(expectedIncome("fixed", p)).toBe(500_000);
    expect(expectedIncome("previous_month", p)).toBe(480_000);
    expect(expectedIncome("avg_3m", p)).toBe(470_000);
  });
});
