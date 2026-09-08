/**
 * Próxima ocurrencia de una regla recurrente + costo mensual equivalente.
 * Espejo de `domain/recurrence.py`.
 */
import { addDays, addMonthsClamped } from "@/lib/dates";

export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export class RecurrenceError extends Error {}

const MONTHS_PER_UNIT: Partial<Record<Frequency, number>> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

// 4.345 = promedio de semanas por mes (52 / 12).
const OCCURRENCES_PER_MONTH: Record<Frequency, number> = {
  daily: 30,
  weekly: 4.345,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

export function nextOccurrence(currentIso: string, frequency: Frequency, interval = 1): string {
  if (interval <= 0) throw new RecurrenceError("interval debe ser mayor a 0");
  if (frequency === "daily") return addDays(currentIso, interval);
  if (frequency === "weekly") return addDays(currentIso, interval * 7);
  const months = MONTHS_PER_UNIT[frequency];
  if (months !== undefined) return addMonthsClamped(currentIso, interval * months);
  throw new RecurrenceError(`frequency desconocida: ${frequency as string}`);
}

function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Normaliza cualquier frecuencia a "cuánto cuesta por mes". */
export function monthlyEquivalentCents(
  amountCents: number,
  frequency: Frequency,
  interval = 1,
): number {
  if (interval <= 0) throw new RecurrenceError("interval debe ser mayor a 0");
  return roundHalfUp((amountCents * OCCURRENCES_PER_MONTH[frequency]) / interval);
}
