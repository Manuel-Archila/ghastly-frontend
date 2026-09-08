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
