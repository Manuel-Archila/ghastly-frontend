/**
 * Mensajes en español (voseo, sin juicios) por `data.code`. El cliente
 * decide por el código estable, nunca por el `message` del servidor.
 */
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "No hay conexión con el servidor. Probá de nuevo cuando tengas internet.",
  BUDGET_ITEM_CATEGORY_TAKEN: "Esa categoría ya está en el presupuesto.",
  BUDGET_REQUIRES_EXPENSE_CATEGORY: "El presupuesto solo acepta categorías de gasto.",
  CATEGORY_NOT_FOUND: "No encontramos esa categoría.",
  LATER_PERIOD_CLOSED: "Hay un mes posterior cerrado. Reabrí primero el más reciente.",
  PERIOD_NOT_FOUND: "Ese mes no está cerrado.",
  CATEGORY_TOO_DEEP: "Las categorías admiten solo dos niveles.",
  CATEGORY_KIND_MISMATCH: "Las dos categorías tienen que ser del mismo tipo.",
  CATEGORY_MERGE_NOOP: "Elegí otra categoría: no se puede fusionar consigo misma.",
  RECEIVABLE_EXCEEDS_TRANSACTION_AMOUNT: "Lo que te deben suma más que el gasto original.",
  RECEIVABLE_ALREADY_SETTLED: "Ya está liquidado; no se puede cambiar.",
  TEMPLATE_NOT_FOUND: "No encontramos esa plantilla.",
  ACCOUNT_NOT_FOUND: "No encontramos esa cuenta.",
};

export function errorMessageFor(e: unknown, fallback = "Algo salió mal. Intentá de nuevo."): string {
  // ApiError y BudgetRuleError comparten la forma `{ code }`.
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === "string" ? (MESSAGES[code] ?? fallback) : fallback;
}
