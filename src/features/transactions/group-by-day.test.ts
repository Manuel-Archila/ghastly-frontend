import { describe, expect, it } from "vitest";
import { flattenSections, groupByDay } from "./group-by-day";
import type { TransactionListItem } from "@/data/repositories/transactions";

function txn(over: Partial<TransactionListItem>): TransactionListItem {
  return {
    id: "x",
    accountId: "a",
    categoryId: null,
    kind: "expense",
    amountCents: 1000,
    currency: "GTQ",
    fxRate: null,
    baseAmountCents: null,
    date: "2026-09-05",
    description: null,
    merchant: null,
    notes: null,
    transferGroupId: null,
    transferDirection: null,
    refundOfId: null,
    isReconciled: false,
    isTaxRelevant: false,
    isExtraordinary: false,
    affectsClosedPeriod: false,
    receiptKey: null,
    tags: [],
    installmentId: null,
    recurringRuleId: null,
    receivableId: null,
    createdAt: "2026-09-05T12:00:00Z",
    updatedAt: "2026-09-05T12:00:00Z",
    deletedAt: null,
    serverSeq: 0,
    categoryName: null,
    accountName: null,
    ...over,
  };
}

describe("groupByDay", () => {
  it("labels today and yesterday", () => {
    const sections = groupByDay(
      [txn({ date: "2026-09-05" }), txn({ date: "2026-09-04" })],
      "2026-09-05",
    );
    expect(sections.map((s) => s.title)).toEqual(["Hoy", "Ayer"]);
  });

  it("sums the day total with expense negative and income positive", () => {
    const sections = groupByDay(
      [
        txn({ date: "2026-09-05", kind: "expense", amountCents: 300 }),
        txn({ date: "2026-09-05", kind: "income", amountCents: 1000 }),
      ],
      "2026-09-05",
    );
    expect(sections[0].totalCents).toBe(700);
  });

  it("excludes transfers from the day total (regla de negocio 1)", () => {
    const sections = groupByDay(
      [
        txn({ date: "2026-09-05", kind: "expense", amountCents: 300 }),
        txn({ date: "2026-09-05", kind: "transfer", amountCents: 5000, transferDirection: "out" }),
      ],
      "2026-09-05",
    );
    expect(sections[0].totalCents).toBe(-300);
  });

  it("sorts days newest first", () => {
    const sections = groupByDay(
      [txn({ date: "2026-09-01" }), txn({ date: "2026-09-10" }), txn({ date: "2026-09-05" })],
      "2026-09-15",
    );
    expect(sections.map((s) => s.isoDate)).toEqual(["2026-09-10", "2026-09-05", "2026-09-01"]);
  });
});

describe("flattenSections", () => {
  it("puts each day header before its items and reports header indices", () => {
    const sections = groupByDay(
      [
        txn({ id: "a", date: "2026-09-05" }),
        txn({ id: "b", date: "2026-09-05" }),
        txn({ id: "c", date: "2026-09-04" }),
      ],
      "2026-09-05",
    );
    const { rows, headerIndices } = flattenSections(sections);
    expect(rows.map((r) => (r.type === "header" ? `H:${r.title}` : `I:${r.key}`))).toEqual([
      "H:Hoy",
      "I:a",
      "I:b",
      "H:Ayer",
      "I:c",
    ]);
    expect(headerIndices).toEqual([0, 3]);
  });

  it("returns empty for no sections", () => {
    expect(flattenSections([])).toEqual({ rows: [], headerIndices: [] });
  });
});
