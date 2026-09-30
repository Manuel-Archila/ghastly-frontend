import { describe, expect, it } from "vitest";

import {
  assertCategoryPresent,
  CategoryRequiredError,
  isMissingRequiredCategory,
  requiresCategory,
} from "./categoryRule";

describe("requiresCategory", () => {
  it("expenses and income require a category", () => {
    expect(requiresCategory("expense")).toBe(true);
    expect(requiresCategory("income")).toBe(true);
  });
  it("transfers do not", () => {
    expect(requiresCategory("transfer")).toBe(false);
  });
});

describe("isMissingRequiredCategory", () => {
  it("an expense with no category is missing it (null, undefined or empty)", () => {
    expect(isMissingRequiredCategory("expense", null)).toBe(true);
    expect(isMissingRequiredCategory("expense", undefined)).toBe(true);
    expect(isMissingRequiredCategory("expense", "")).toBe(true);
  });
  it("an income with no category is missing it too", () => {
    expect(isMissingRequiredCategory("income", null)).toBe(true);
  });
  it("an expense or income with a category is fine", () => {
    expect(isMissingRequiredCategory("expense", "cat-1")).toBe(false);
    expect(isMissingRequiredCategory("income", "cat-1")).toBe(false);
  });
  it("a transfer without category is fine", () => {
    expect(isMissingRequiredCategory("transfer", null)).toBe(false);
  });
});

describe("assertCategoryPresent", () => {
  it("throws CategoryRequiredError, with the backend's code, for an expense or income without category", () => {
    expect(() => assertCategoryPresent("expense", null)).toThrow(CategoryRequiredError);
    expect(() => assertCategoryPresent("income", null)).toThrow(CategoryRequiredError);
    try {
      assertCategoryPresent("expense", null);
    } catch (e) {
      expect((e as CategoryRequiredError).code).toBe("CATEGORY_REQUIRED");
    }
  });
  it("does not throw when the rule is met or does not apply", () => {
    expect(() => assertCategoryPresent("expense", "cat-1")).not.toThrow();
    expect(() => assertCategoryPresent("income", "cat-1")).not.toThrow();
    expect(() => assertCategoryPresent("transfer", null)).not.toThrow();
  });
});
