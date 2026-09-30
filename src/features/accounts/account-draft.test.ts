import { describe, expect, it } from "vitest";

import {
  buildAccountInputs,
  canAddDollarBalance,
  emptyAccountDraft,
  parseDay,
  parsePercent,
  type AccountDraft,
} from "./account-draft";

function draft(over: Partial<AccountDraft>): AccountDraft {
  return { ...emptyAccountDraft(), ...over };
}

describe("parsePercent / parseDay", () => {
  it("parses percentages with a dot or a comma, and empty is null", () => {
    expect(parsePercent("2.5")).toBe(2.5);
    expect(parsePercent("2,5")).toBe(2.5);
    expect(parsePercent("")).toBeNull();
    expect(parsePercent("abc")).toBeNull();
  });
  it("parses whole days only", () => {
    expect(parseDay("15")).toBe(15);
    expect(parseDay("")).toBeNull();
    expect(parseDay("1.5")).toBeNull();
  });
});

describe("buildAccountInputs", () => {
  it("creates nothing for a draft without a name", () => {
    expect(buildAccountInputs(draft({ name: "   " }))).toEqual([]);
  });

  it("creates one quetzal account by default", () => {
    expect(buildAccountInputs(draft({ name: " BAC Monetaria ", balance: "1500.50" }))).toEqual([
      { name: "BAC Monetaria", type: "checking", currency: "GTQ", initialBalanceCents: 150_050 },
    ]);
  });

  it("creates a dollar account when USD is chosen", () => {
    const [account] = buildAccountInputs(draft({ name: "Ahorro $", type: "savings", currency: "USD", balance: "200" }));
    expect(account.currency).toBe("USD");
    expect(account.initialBalanceCents).toBe(20_000);
  });

  it("does not send card fields for a non-card account", () => {
    const [account] = buildAccountInputs(draft({ name: "x", statementDay: "5", creditLimit: "9000" }));
    expect(account).not.toHaveProperty("statementDay");
    expect(account).not.toHaveProperty("creditLimitCents");
  });

  it("a card can be saved with every card field empty (the minimum payment is optional)", () => {
    const [card] = buildAccountInputs(draft({ name: "Visa", type: "credit_card" }));
    expect(card).toMatchObject({
      type: "credit_card",
      creditLimitCents: null,
      statementDay: null,
      paymentDueDay: null,
      interestRate: null,
      minimumPaymentPercent: null,
    });
  });

  it("a card with a dollar balance becomes two accounts that share the cycle days", () => {
    const inputs = buildAccountInputs(
      draft({
        name: "BAC Visa",
        type: "credit_card",
        balance: "1000",
        creditLimit: "20000",
        statementDay: "10",
        paymentDueDay: "28",
        alsoInDollars: true,
        usdBalance: "150",
        usdCreditLimit: "2500",
      }),
    );
    expect(inputs).toHaveLength(2);
    const [gtq, usd] = inputs;
    expect(gtq).toMatchObject({ name: "BAC Visa", currency: "GTQ", initialBalanceCents: 100_000, creditLimitCents: 2_000_000 });
    expect(usd).toMatchObject({ name: "BAC Visa USD", currency: "USD", initialBalanceCents: 15_000, creditLimitCents: 250_000 });
    expect([usd.statementDay, usd.paymentDueDay]).toEqual([gtq.statementDay, gtq.paymentDueDay]);
  });

  it("ignores the dollar toggle when it does not apply", () => {
    expect(buildAccountInputs(draft({ name: "x", type: "checking", alsoInDollars: true }))).toHaveLength(1);
    expect(
      buildAccountInputs(draft({ name: "x", type: "credit_card", currency: "USD", alsoInDollars: true })),
    ).toHaveLength(1);
  });
});

describe("canAddDollarBalance", () => {
  it("only for a quetzal credit card", () => {
    expect(canAddDollarBalance({ type: "credit_card", currency: "GTQ" })).toBe(true);
    expect(canAddDollarBalance({ type: "credit_card", currency: "USD" })).toBe(false);
    expect(canAddDollarBalance({ type: "checking", currency: "GTQ" })).toBe(false);
  });
});
