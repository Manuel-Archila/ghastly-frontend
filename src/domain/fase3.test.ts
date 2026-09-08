import { describe, expect, it } from "vitest";
import { amortize } from "./amortization";
import { computeCurrentCycle } from "./creditCycle";
import { generateInstallmentSchedule } from "./installments";
import { monthlyEquivalentCents, nextOccurrence } from "./recurrence";

describe("amortize", () => {
  it("zero rate matches Money.allocate (remainder to last)", () => {
    const entries = amortize(1_000_000, 0, 12);
    expect(entries.reduce((s, e) => s + e.principalCents, 0)).toBe(1_000_000);
    expect(entries[0].paymentCents).toBe(83_333);
    expect(entries[11].paymentCents).toBe(83_337);
    expect(entries[11].remainingBalanceCents).toBe(0);
  });

  it("with interest: principal sums to original, ends at zero", () => {
    const entries = amortize(120_000, 0.02, 12);
    expect(entries.reduce((s, e) => s + e.principalCents, 0)).toBe(120_000);
    expect(entries[0].interestCents).toBe(2_400);
    expect(entries[11].remainingBalanceCents).toBe(0);
  });
});

describe("generateInstallmentSchedule", () => {
  it("case 6: 12 cuotas, suma exacta, fechas mensuales", () => {
    const schedule = generateInstallmentSchedule(1_000_000, 12, "2026-01-31");
    expect(schedule).toHaveLength(12);
    expect(schedule.reduce((s, e) => s + e.amountCents, 0)).toBe(1_000_000);
    expect(schedule[1].dueDate).toBe("2026-02-28"); // no existe el 31
  });
});

describe("recurrence", () => {
  it("nextOccurrence handles end of month", () => {
    expect(nextOccurrence("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextOccurrence("2026-12-15", "yearly")).toBe("2027-12-15");
  });

  it("monthlyEquivalentCents normalizes frequencies", () => {
    expect(monthlyEquivalentCents(8_900, "monthly")).toBe(8_900);
    expect(monthlyEquivalentCents(1_200_000, "yearly")).toBe(100_000);
    expect(monthlyEquivalentCents(100, "weekly", 2)).toBe(217);
  });
});

describe("computeCurrentCycle", () => {
  it("statement later this month, payment rolls to next month", () => {
    const cycle = computeCurrentCycle("2026-09-04", 18, 3);
    expect(cycle.statementDate).toBe("2026-09-18");
    expect(cycle.paymentDueDate).toBe("2026-10-03");
    expect(cycle.daysUntilStatement).toBe(14);
  });

  it("statement already passed rolls to next month", () => {
    const cycle = computeCurrentCycle("2026-09-20", 18, 3);
    expect(cycle.statementDate).toBe("2026-10-18");
  });
});
