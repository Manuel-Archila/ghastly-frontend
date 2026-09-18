import { describe, expect, it } from "vitest";

import { categoryColorFor } from "@/lib/categoryColor";
import { lightColors } from "@/ui/tokens/colors";

describe("categoryColorFor", () => {
  it("is stable for the same id", () => {
    const id = "cat-alimentacion";
    expect(categoryColorFor(id, lightColors)).toBe(categoryColorFor(id, lightColors));
  });

  it("returns a color from the fixed categorical palette", () => {
    const color = categoryColorFor("cat-transporte", lightColors);
    expect(lightColors.categorical).toContain(color);
  });

  it("spreads different ids across slots (not everything the same color)", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const colors = new Set(ids.map((id) => categoryColorFor(id, lightColors)));
    expect(colors.size).toBeGreaterThan(1);
  });
});
