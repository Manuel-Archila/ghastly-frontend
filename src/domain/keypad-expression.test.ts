import { describe, expect, it } from "vitest";
import { evaluateKeypadExpression } from "./keypad-expression";

describe("evaluateKeypadExpression", () => {
  it("plain whole number is quetzales", () => {
    expect(evaluateKeypadExpression("250")).toBe(25_000);
  });
  it("with decimals", () => {
    expect(evaluateKeypadExpression("12.50")).toBe(1_250);
    expect(evaluateKeypadExpression("12.5")).toBe(1_250);
  });
  it("adds operands (cuenta del súper)", () => {
    expect(evaluateKeypadExpression("12.50+3.75+1")).toBe(1_725);
  });
  it("subtracts", () => {
    expect(evaluateKeypadExpression("100-25.50")).toBe(7_450);
  });
  it("trailing operator is ignored", () => {
    expect(evaluateKeypadExpression("50+")).toBe(5_000);
  });
  it("empty is zero", () => {
    expect(evaluateKeypadExpression("")).toBe(0);
  });
});
