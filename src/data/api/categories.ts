/**
 * Operaciones de categorías que NO viajan por sync: cambiar el padre,
 * fusionar, reordenar en bloque y la semilla. Son online — el servidor
 * valida (`CATEGORY_TOO_DEEP`, `CATEGORY_KIND_MISMATCH`,
 * `CATEGORY_MERGE_NOOP`) y después se fuerza un pull.
 */
import { api } from "@/data/api/client";

export interface CategoryOut {
  id: string;
  name: string;
  kind: "expense" | "income";
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  is_archived: boolean;
  is_tax_deductible: boolean;
  sort_order: number;
}

/** `parentId: null` la vuelve raíz. */
export function setCategoryParent(id: string, parentId: string | null): Promise<CategoryOut> {
  return api.patch(`/categories/${id}`, { parent_id: parentId });
}

export function mergeCategory(id: string, intoId: string): Promise<unknown> {
  return api.post(`/categories/${id}/merge`, { into_id: intoId });
}

export function reorderCategories(ids: string[]): Promise<unknown> {
  return api.patch("/categories/reorder", { ids });
}

/** Idempotente. */
export function seedDefaultCategories(): Promise<unknown> {
  return api.post("/categories/seed");
}
