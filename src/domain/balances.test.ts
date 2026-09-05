import { describe, expect, it } from "vitest";
import { BalanceError, computeBalance, signedDelta } from "./balances";

describe("signedDelta", () => {
  it("reduces an asset account on expense", () => {
    expect(signedDelta({ kind: "expense", amountCents: 1000 }, "checking")).toBe(-1000);
  });

  it("increases an asset account on income", () => {
    expect(signedDelta({ kind: "income", amountCents: 1000 }, "savings")).toBe(1000);
  });

  it("increases credit card debt on expense", () => {
    expect(signedDelta({ kind: "expense", amountCents: 500 }, "credit_card")).toBe(500);
  });

  it("reduces credit card debt on income", () => {
    expect(signedDelta({ kind: "income", amountCents: 200 }, "credit_card")).toBe(-200);
  });

  it("reduces an asset account on transfer out", () => {
    expect(
      signedDelta({ kind: "transfer", amountCents: 300, transferDirection: "out" }, "checking"),
    ).toBe(-300);
  });

  it("reduces credit card debt on transfer in (paying the card)", () => {
    expect(
      signedDelta({ kind: "transfer", amountCents: 1000, transferDirection: "in" }, "credit_card"),
    ).toBe(-1000);
  });

  it("throws when a transfer has no direction", () => {
    expect(() => signedDelta({ kind: "transfer", amountCents: 100 }, "checking")).toThrow(
      BalanceError,
    );
  });

  it("throws on negative amounts", () => {
    expect(() => signedDelta({ kind: "expense", amountCents: -100 }, "checking")).toThrow(
      BalanceError,
    );
  });
});

describe("computeBalance", () => {
  it("folds a checking account history", () => {
    const entries = [
      { kind: "income" as const, amountCents: 500_000 },
      { kind: "expense" as const, amountCents: 100_000 },
      { kind: "transfer" as const, amountCents: 50_000, transferDirection: "out" as const },
    ];
    expect(computeBalance(0, entries, "checking")).toBe(350_000);
  });

  it("folds a credit card purchase then payment", () => {
    const entries = [
      { kind: "expense" as const, amountCents: 200_000 },
      { kind: "transfer" as const, amountCents: 150_000, transferDirection: "in" as const },
    ];
    expect(computeBalance(0, entries, "credit_card")).toBe(50_000);
  });
});
