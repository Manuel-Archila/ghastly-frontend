import { describe, expect, it } from "vitest";
import {
  childrenExcess,
  computeItemProgress,
  computeRolloverOut,
  effectiveParents,
  expectedIncome,
  projectPeriodEnd,
  rollupSpent,
  suggestedDailyPace,
  summarizeHierarchy,
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

describe("effectiveParents", () => {
  it("un hijo sin padre presupuestado es raíz", () => {
    const m = effectiveParents(new Map([["pizza", "comida"]]));
    expect(m.get("pizza")).toBeNull();
  });

  it("un hijo con padre presupuestado se anida", () => {
    const m = effectiveParents(
      new Map<string, string | null>([
        ["comida", null],
        ["pizza", "comida"],
      ]),
    );
    expect(m.get("pizza")).toBe("comida");
    expect(m.get("comida")).toBeNull();
  });
});

describe("rollupSpent", () => {
  it("suma gasto propio + subcategorías", () => {
    const spent = new Map([
      ["comida", 1_000],
      ["pizza", 400],
      ["cafe", 250],
      ["otra", 9_999],
    ]);
    expect(rollupSpent("comida", ["pizza", "cafe"], spent)).toBe(1_650);
  });

  it("sin gasto ni hijos es 0", () => {
    expect(rollupSpent("x", [], new Map())).toBe(0);
  });
});

describe("childrenExcess", () => {
  it("hijos que caben: 0", () => {
    expect(childrenExcess(10_000, [4_000, 5_000])).toBe(0);
  });

  it("hijos que se pasan: la diferencia", () => {
    expect(childrenExcess(10_000, [6_000, 7_000])).toBe(3_000);
  });
});

describe("summarizeHierarchy", () => {
  it("presupuesto plano queda igual", () => {
    const s = summarizeHierarchy(
      new Map([
        ["a", 100],
        ["b", 200],
      ]),
      new Map([
        ["a", null],
        ["b", null],
      ]),
    );
    expect(s.rootTotalCents).toBe(300);
    expect(s.childrenBudgeted.size).toBe(0);
    expect(s.childrenExcess.size).toBe(0);
  });

  it("hijos que caben: el total son solo las raíces", () => {
    const s = summarizeHierarchy(
      new Map([
        ["comida", 10_000],
        ["pizza", 4_000],
        ["cafe", 3_000],
      ]),
      new Map<string, string | null>([
        ["comida", null],
        ["pizza", "comida"],
        ["cafe", "comida"],
      ]),
    );
    expect(s.rootTotalCents).toBe(10_000);
    expect(s.childrenBudgeted.get("comida")).toBe(7_000);
    expect(s.childrenExcess.has("comida")).toBe(false);
  });

  it("hijos que se pasan reportan el exceso", () => {
    const s = summarizeHierarchy(
      new Map([
        ["comida", 5_000],
        ["pizza", 4_000],
        ["cafe", 3_000],
      ]),
      new Map<string, string | null>([
        ["comida", null],
        ["pizza", "comida"],
        ["cafe", "comida"],
      ]),
    );
    expect(s.childrenExcess.get("comida")).toBe(2_000);
    expect(s.rootTotalCents).toBe(5_000);
  });
});
