/**
 * Presupuestos: consumo, disponible, proyección y ritmo diario. Espejo de
 * `domain/budget.py` del backend. Se calcula local para pintar al
 * instante; el servidor lo sobrescribe al llegar el pull.
 */

export interface BudgetItemProgress {
  budgetedCents: number;
  rolloverInCents: number;
  spentCents: number;
  availableCents: number;
  percentConsumed: number; // entero, puede pasar de 100
}

function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function computeItemProgress(params: {
  budgetedCents: number;
  spentCents: number;
  rolloverInCents?: number;
}): BudgetItemProgress {
  const rolloverInCents = params.rolloverInCents ?? 0;
  const totalBudget = params.budgetedCents + rolloverInCents;
  const availableCents = totalBudget - params.spentCents;

  let percentConsumed: number;
  if (totalBudget === 0) {
    percentConsumed = params.spentCents === 0 ? 0 : 100;
  } else {
    percentConsumed = roundHalfUp((params.spentCents / totalBudget) * 100);
  }

  return {
    budgetedCents: params.budgetedCents,
    rolloverInCents,
    spentCents: params.spentCents,
    availableCents,
    percentConsumed,
  };
}

/** "A este ritmo terminás en Q X": extrapola el ritmo real de gasto. */
export function projectPeriodEnd(
  spentCents: number,
  daysElapsed: number,
  daysInPeriod: number,
): number {
  if (daysElapsed <= 0) return spentCents;
  return roundHalfUp((spentCents / daysElapsed) * daysInPeriod);
}

/** "~Q 30/día": cuánto se puede gastar por día con lo que queda. */
export function suggestedDailyPace(availableCents: number, daysRemaining: number): number {
  if (daysRemaining <= 0) return availableCents;
  return roundHalfUp(availableCents / daysRemaining);
}

/** Al cerrar el período: solo el SOBRANTE pasa al mes siguiente. */
export function computeRolloverOut(availableCents: number, rolloverEnabled: boolean): number {
  if (!rolloverEnabled || availableCents <= 0) return 0;
  return availableCents;
}

export type IncomeBasis = "fixed" | "previous_month" | "avg_3m";

export function expectedIncome(
  basis: IncomeBasis,
  params: { fixedCents: number; previousMonthCents: number; avg3mCents: number },
): number {
  if (basis === "fixed") return params.fixedCents;
  if (basis === "previous_month") return params.previousMonthCents;
  return params.avg3mCents;
}

// ── Jerarquía de presupuesto ────────────────────────────────────────────
// La jerarquía NO se guarda en el ítem: se deriva de `categories.parentId`
// (máximo 2 niveles). El tope del padre solo ADVIERTE, nunca bloquea.

/**
 * Para cada categoría presupuestada, su `parent_id` SOLO si el padre
 * también tiene ítem en el presupuesto; si no, `null` (queda como raíz).
 */
export function effectiveParents(
  budgetedCategoryParents: Map<string, string | null>,
): Map<string, string | null> {
  const result = new Map<string, string | null>();
  for (const [category, parent] of budgetedCategoryParents) {
    result.set(category, parent !== null && budgetedCategoryParents.has(parent) ? parent : null);
  }
  return result;
}

/** Gasto propio de la categoría + el de sus subcategorías. */
export function rollupSpent(
  category: string,
  childCategories: string[],
  spentByCategory: Map<string, number>,
): number {
  let total = spentByCategory.get(category) ?? 0;
  for (const child of childCategories) total += spentByCategory.get(child) ?? 0;
  return total;
}

/** Cuánto se pasan los hijos del tope del padre (0 si caben). */
export function childrenExcess(parentCents: number, childrenCents: number[]): number {
  const sum = childrenCents.reduce((a, b) => a + b, 0);
  return Math.max(0, sum - parentCents);
}

export interface HierarchySummary {
  childrenBudgeted: Map<string, number>;
  /** Solo padres con exceso > 0. */
  childrenExcess: Map<string, number>;
  /** Suma únicamente de ítems raíz: los hijos son un reparto dentro del padre. */
  rootTotalCents: number;
}

export function summarizeHierarchy(
  budgeted: Map<string, number>,
  parentOf: Map<string, string | null>,
): HierarchySummary {
  const childrenBudgeted = new Map<string, number>();
  let rootTotalCents = 0;
  for (const [category, cents] of budgeted) {
    const parent = parentOf.get(category) ?? null;
    if (parent === null) {
      rootTotalCents += cents;
    } else {
      childrenBudgeted.set(parent, (childrenBudgeted.get(parent) ?? 0) + cents);
    }
  }
  const excess = new Map<string, number>();
  for (const [parent, sum] of childrenBudgeted) {
    const e = childrenExcess(budgeted.get(parent) ?? 0, [sum]);
    if (e > 0) excess.set(parent, e);
  }
  return { childrenBudgeted, childrenExcess: excess, rootTotalCents };
}
