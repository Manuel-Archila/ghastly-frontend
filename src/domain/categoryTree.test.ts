import { describe, expect, it } from "vitest";
import { flattenTree, validateParent, type CategoryNode } from "./categoryTree";

const cats: CategoryNode[] = [
  { id: "comida", parentId: null, kind: "expense" },
  { id: "pizza", parentId: "comida", kind: "expense" },
  { id: "hogar", parentId: null, kind: "expense" },
  { id: "sueldo", parentId: null, kind: "income" },
];

describe("validateParent", () => {
  it("raíz siempre se puede", () => {
    expect(validateParent("pizza", null, cats)).toBeNull();
  });
  it("mover una raíz sin hijos bajo otra raíz", () => {
    expect(validateParent("hogar", "comida", cats)).toBeNull();
  });
  it("no puede ser su propio padre", () => {
    expect(validateParent("hogar", "hogar", cats)).toBe("CATEGORY_SELF_PARENT");
  });
  it("padre que ya es subcategoría: 3 niveles", () => {
    expect(validateParent("hogar", "pizza", cats)).toBe("CATEGORY_TOO_DEEP");
  });
  it("categoría con hijas no puede volverse subcategoría", () => {
    expect(validateParent("comida", "hogar", cats)).toBe("CATEGORY_TOO_DEEP");
  });
  it("tipos distintos", () => {
    expect(validateParent("hogar", "sueldo", cats)).toBe("CATEGORY_KIND_MISMATCH");
  });
});

describe("flattenTree", () => {
  it("raíz seguida de sus hijas", () => {
    const rows = flattenTree([
      { id: "pizza", parentId: "comida" },
      { id: "comida", parentId: null },
      { id: "hogar", parentId: null },
    ]);
    expect(rows.map((r) => [r.category.id, r.depth])).toEqual([
      ["comida", 0],
      ["pizza", 1],
      ["hogar", 0],
    ]);
  });
  it("hija con padre ausente se muestra como raíz", () => {
    const rows = flattenTree([{ id: "pizza", parentId: "comida" }]);
    expect(rows).toEqual([{ category: { id: "pizza", parentId: "comida" }, depth: 0 }]);
  });
});
