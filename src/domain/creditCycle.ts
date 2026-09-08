/**
 * Ciclo de tarjeta de crédito: próxima fecha de corte y de pago. Espejo de
 * `domain/credit_cycle.py`.
 */
import { addMonthsClamped, clampDay, daysBetween } from "@/lib/dates";

export interface CreditCycle {
  statementDate: string;
  paymentDueDate: string;
  daysUntilStatement: number;
  daysUntilPaymentDue: number;
}

function nextDayOfMonth(referenceIso: string, day: number, inclusive: boolean): string {
  const [y, m] = referenceIso.split("-").map(Number);
  const candidate = clampDay(y, m, day);
  if (candidate > referenceIso || (inclusive && candidate === referenceIso)) {
    return candidate;
  }
  const nextMonthFirst = addMonthsClamped(`${referenceIso.slice(0, 8)}01`, 1);
  const [ny, nm] = nextMonthFirst.split("-").map(Number);
  return clampDay(ny, nm, day);
}

export function computeCurrentCycle(
  todayIso: string,
  statementDay: number,
  paymentDueDay: number,
): CreditCycle {
  const statementDate = nextDayOfMonth(todayIso, statementDay, true);
  const paymentDueDate = nextDayOfMonth(statementDate, paymentDueDay, false);
  return {
    statementDate,
    paymentDueDate,
    daysUntilStatement: daysBetween(todayIso, statementDate),
    daysUntilPaymentDue: daysBetween(todayIso, paymentDueDate),
  };
}
