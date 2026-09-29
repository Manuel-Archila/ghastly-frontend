import { describe, expect, it } from "vitest";

import {
  assertCategoryPresent,
  CategoryRequiredError,
  isMissingRequiredCategory,
  requiresCategory,
} from "./categoryRule";

describe("requiresCategory", () => {
  it("an expense requires a category", () => {
    expect(requiresCategory("expense")).toBe(true);
  });
  it("income and transfers do not", () => {
    expect(requiresCategory("income")).toBe(false);
    expect(requiresCategory("transfer")).toBe(false);
  });
});

describe("isMissingRequiredCategory", () => {
  it("an expense with no category is missing it (null, undefined or empty)", () => {
    expect(isMissingRequiredCategory("expense", null)).toBe(true);
    expect(isMissingRequiredCategory("expense", undefined)).toBe(true);
    expect(isMissingRequiredCategory("expense", "")).toBe(true);
  });
  it("an expense with a category is fine", () => {
    expect(isMissingRequiredCategory("expense", "cat-1")).toBe(false);
  });
  it("income and transfers without category are fine", () => {
    expect(isMissingRequiredCategory("income", null)).toBe(false);
    expect(isMissingRequiredCategory("transfer", null)).toBe(false);
  });
});

describe("assertCategoryPresent", () => {
  it("throws CategoryRequiredError, with the backend's code, for an expense without category", () => {
    expect(() => assertCategoryPresent("expense", null)).toThrow(CategoryRequiredError);
    try {
      assertCategoryPresent("expense", null);
    } catch (e) {
      expect((e as CategoryRequiredError).code).toBe("CATEGORY_REQUIRED");
    }
  });
  it("does not throw when the rule is met or does not apply", () => {
    expect(() => assertCategoryPresent("expense", "cat-1")).not.toThrow();
    expect(() => assertCategoryPresent("income", null)).not.toThrow();
  });
});
