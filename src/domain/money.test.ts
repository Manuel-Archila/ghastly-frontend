import { describe, expect, it } from "vitest";
import { Money, MoneyError, formatForKind, parseCentsFromInput, sumMoney } from "./money";

describe("Money", () => {
  it("rejects non-integer cents", () => {
    expect(() => new Money(10.5)).toThrow(MoneyError);
  });

  it("adds amounts of the same currency", () => {
    expect(new Money(1000, "GTQ").add(new Money(500, "GTQ"))).toEqual(new Money(1500, "GTQ"));
  });

  it("rejects adding different currencies", () => {
    expect(() => new Money(1000, "GTQ").add(new Money(500, "USD"))).toThrow(MoneyError);
  });

  it("subtracts", () => {
    expect(new Money(1000).subtract(new Money(300))).toEqual(new Money(700));
  });

  it("negates", () => {
    expect(new Money(500).negate()).toEqual(new Money(-500));
    expect(new Money(-500).negate()).toEqual(new Money(500));
  });

  it("reports zero and negative", () => {
    expect(new Money(0).isZero()).toBe(true);
    expect(new Money(1).isZero()).toBe(false);
    expect(new Money(-1).isNegative()).toBe(true);
    expect(new Money(1).isNegative()).toBe(false);
  });

  it("allocates an exact split evenly", () => {
    expect(new Money(900).allocate(3)).toEqual([new Money(300), new Money(300), new Money(300)]);
  });

  it("allocates the remainder to the last share", () => {
    const shares = new Money(1000).allocate(3);
    expect(shares).toEqual([new Money(333), new Money(333), new Money(334)]);
    expect(shares.reduce((sum, m) => sum + m.cents, 0)).toBe(1000);
  });

  it("case 6: a phone in 12 installments never loses a cent", () => {
    const shares = new Money(1_000_000).allocate(12);
    expect(shares).toHaveLength(12);
    expect(shares.reduce((sum, m) => sum + m.cents, 0)).toBe(1_000_000);
    expect(shares[0]).toEqual(new Money(83_333));
    expect(shares[11]).toEqual(new Money(83_337));
  });

  it("rejects a non-positive number of parts", () => {
    expect(() => new Money(100).allocate(0)).toThrow(MoneyError);
    expect(() => new Money(100).allocate(-1)).toThrow(MoneyError);
  });

  it("converts and freezes the rate (case 4)", () => {
    const usd = new Money(10_000, "USD");
    expect(usd.convert(7.85, "GTQ")).toEqual(new Money(78_500, "GTQ"));
  });

  it("formats GTQ with a space after the symbol", () => {
    expect(new Money(123_456, "GTQ").format()).toBe("Q 1,234.56");
    expect(new Money(-500, "GTQ").format()).toBe("− Q 5.00");
  });

  it("formats USD", () => {
    expect(new Money(100, "USD").format()).toBe("$ 1.00");
  });

  it("sums a list of amounts", () => {
    expect(sumMoney([new Money(100), new Money(200), new Money(300)])).toEqual(new Money(600));
  });

  it("sums an empty list to zero", () => {
    expect(sumMoney([])).toEqual(new Money(0));
  });
});

describe("parseCentsFromInput", () => {
  it("parses whole quetzales", () => {
    expect(parseCentsFromInput("250")).toBe(25_000);
  });

  it("parses one and two decimal places", () => {
    expect(parseCentsFromInput("250.5")).toBe(25_050);
    expect(parseCentsFromInput("250.55")).toBe(25_055);
  });

  it("ignores thousands separators", () => {
    expect(parseCentsFromInput("1,250.50")).toBe(125_050);
  });

  it("rejects invalid or empty input", () => {
    expect(parseCentsFromInput("")).toBeNull();
    expect(parseCentsFromInput("abc")).toBeNull();
    expect(parseCentsFromInput("10.999")).toBeNull();
    expect(parseCentsFromInput("0")).toBeNull();
  });
});

describe("formatForKind", () => {
  it("prefixes an expense with the minus sign", () => {
    expect(formatForKind(new Money(25_000, "GTQ"), "expense")).toBe("− Q 250.00");
  });

  it("prefixes income with a plus sign", () => {
    expect(formatForKind(new Money(450_000, "GTQ"), "income")).toBe("+ Q 4,500.00");
  });

  it("shows a transfer with a trailing arrow and no sign", () => {
    expect(formatForKind(new Money(50_000, "GTQ"), "transfer")).toBe("Q 500.00 →");
  });
});
