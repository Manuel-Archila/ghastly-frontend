/**
 * Un gasto no puede existir sin categoría. Espejo de `domain/category_rule.py`
 * del backend, que la exige en todos sus caminos (transacción, plantilla, regla
 * recurrente, plan de cuotas y `/sync/push`).
 *
 * Los ingresos (un cobro, un reembolso) y las transferencias pueden no tener
 * categoría. Vale para todo lo que termina siendo un gasto, no solo para la
 * captura rápida.
 */

export function requiresCategory(kind: string): boolean {
  return kind === "expense";
}

/** True si es un gasto y no trae categoría. */
export function isMissingRequiredCategory(kind: string, categoryId: string | null | undefined): boolean {
  return requiresCategory(kind) && !categoryId;
}

/** Mismo `code` que devuelve el backend, para que `errorMessageFor` lo traduzca igual. */
export class CategoryRequiredError extends Error {
  readonly code = "CATEGORY_REQUIRED";

  constructor() {
    super("Un gasto necesita una categoría.");
    this.name = "CategoryRequiredError";
  }
}

/** Lanza `CategoryRequiredError` si un gasto no trae categoría. */
export function assertCategoryPresent(kind: string, categoryId: string | null | undefined): void {
  if (isMissingRequiredCategory(kind, categoryId)) throw new CategoryRequiredError();
}
