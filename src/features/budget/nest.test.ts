import { describe, expect, it } from "vitest";
import { nestByParent } from "./nest";

describe("nestByParent", () => {
  it("cada raíz seguida de sus hijos, en el orden de las raíces", () => {
    const rows = nestByParent([
      { categoryId: "pizza", parentCategoryId: "comida" },
      { categoryId: "comida", parentCategoryId: null },
      { categoryId: "hogar", parentCategoryId: null },
      { categoryId: "cafe", parentCategoryId: "comida" },
    ]);
    expect(rows.map((r) => `${r.depth}:${r.item.categoryId}`)).toEqual([
      "0:comida",
      "1:pizza",
      "1:cafe",
      "0:hogar",
    ]);
  });

  it("presupuesto plano queda igual", () => {
    const rows = nestByParent([
      { categoryId: "a", parentCategoryId: null },
      { categoryId: "b", parentCategoryId: null },
    ]);
    expect(rows.map((r) => r.item.categoryId)).toEqual(["a", "b"]);
  });
});
