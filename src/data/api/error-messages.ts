/**
 * Mensajes en español (voseo, sin juicios) por `data.code`. El cliente
 * decide por el código estable, nunca por el `message` del servidor.
 */
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "No hay conexión con el servidor. Probá de nuevo cuando tengas internet.",
  BUDGET_ITEM_CATEGORY_TAKEN: "Esa categoría ya está en el presupuesto.",
  BUDGET_REQUIRES_EXPENSE_CATEGORY: "El presupuesto solo acepta categorías de gasto.",
  CATEGORY_NOT_FOUND: "No encontramos esa categoría.",
  CATEGORY_REQUIRED: "Elegí una categoría.",
  LATER_PERIOD_CLOSED: "Hay un mes posterior cerrado. Reabrí primero el más reciente.",
  PERIOD_NOT_FOUND: "Ese mes no está cerrado.",
  CATEGORY_TOO_DEEP: "Las categorías admiten solo dos niveles.",
  CATEGORY_KIND_MISMATCH: "Las dos categorías tienen que ser del mismo tipo.",
  CATEGORY_MERGE_NOOP: "Elegí otra categoría: no se puede fusionar consigo misma.",
  RECEIVABLE_EXCEEDS_TRANSACTION_AMOUNT: "Lo que te deben suma más que el gasto original.",
  RECEIVABLE_ALREADY_SETTLED: "Ya está liquidado; no se puede cambiar.",
  TEMPLATE_NOT_FOUND: "No encontramos esa plantilla.",
  ACCOUNT_NOT_FOUND: "No encontramos esa cuenta.",
  ACCOUNT_HAS_BALANCE: "La cuenta todavía tiene saldo. Volvé a intentar y confirmá para archivarla igual.",
  TRANSFER_SAME_ACCOUNT: "La cuenta origen y destino no pueden ser la misma.",
  TRANSFER_TO_AMOUNT_REQUIRED: "Las cuentas son de monedas distintas: falta cuánto llega a la cuenta destino.",
  // Sesión
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  EMAIL_TAKEN: "Ya existe una cuenta con ese correo.",
  REGISTRATION_DISABLED: "El registro está cerrado por ahora.",
  RATE_LIMITED: "Hiciste varios intentos seguidos. Esperá un momento y probá de nuevo.",
  // Genérico: el servidor rechazó un dato. Sin `field` no podemos decir cuál.
  VALIDATION_ERROR: "Revisá los datos: hay un campo que no es válido.",
  // Deudas
  DEBT_NOT_FOUND: "No encontramos esa deuda.",
  DEBT_PAYMENT_TOO_SMALL: "El pago no alcanza para cubrir el interés y las comisiones.",
  DEBT_MISSING_TERM: "Esta deuda no tiene plazo definido, así que no se puede armar su plan de pagos.",
  DEBT_AMORTIZATION_ERROR: "No se pudo calcular el plan de pagos con esos datos.",
  // Metas
  GOAL_NOT_FOUND: "No encontramos esa meta.",
  // Cuotas
  INSTALLMENT_PLAN_NOT_FOUND: "No encontramos ese plan de cuotas.",
  INSTALLMENT_NOT_FOUND: "No encontramos esa cuota.",
  INSTALLMENT_NOT_PENDING: "Esa cuota ya no está pendiente.",
  // Suscripciones y moneda extranjera
  RECURRING_RULE_NOT_FOUND: "No encontramos esa suscripción.",
  RECURRING_RULE_NOT_ACTIVE: "Esa suscripción está pausada.",
  FX_RATE_REQUIRED: "Falta la tasa de cambio para una cuenta en otra moneda.",
};

export function errorMessageFor(e: unknown, fallback = "Algo salió mal. Intentá de nuevo."): string {
  // ApiError y BudgetRuleError comparten la forma `{ code }`.
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === "string" ? (MESSAGES[code] ?? fallback) : fallback;
}
