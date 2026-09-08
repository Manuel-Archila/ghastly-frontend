/**
 * Aritmética de fechas de calendario. Espejo de `domain/dates.py`. Las
 * fechas se manejan como strings `YYYY-MM-DD` — sin `Date` con hora, para
 * no pelear con timezones.
 */

export function clampDay(year: number, month1: number, day: number): string {
  const lastDay = new Date(year, month1, 0).getDate(); // month1 es 1-12
  const d = Math.min(day, lastDay);
  return `${year}-${String(month1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Suma meses recortando al último día si ese mes es más corto
 * (31 de enero + 1 mes = 28/29 de febrero). */
export function addMonthsClamped(iso: string, months: number): string {
  const [y, m, day] = iso.split("-").map(Number);
  const idx = m - 1 + months;
  const year = y + Math.floor(idx / 12);
  const month1 = ((idx % 12) + 12) % 12 + 1;
  return clampDay(year, month1, day);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}
