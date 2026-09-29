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

/** Fecha de HOY en el calendario local del dispositivo — `toISOString()`
 * da la fecha en UTC, que ya es "mañana" entre las 18:00 y la medianoche
 * en Guatemala (UTC-6). Esto es solo el default que ve el usuario en un
 * formulario; la fecha real de negocio siempre la decide el servidor
 * (CLAUDE.md), pero un default equivocado es un default que hay que
 * corregir a mano cada vez. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
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

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** `"2026-09"` (o cualquier `AAAA-MM-DD`) → `"Septiembre 2026"`. Nunca se le
 * muestra al usuario el mes en ISO. Si no parsea, devuelve el texto tal cual. */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.slice(0, 7).split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return month;
  const name = MONTH_NAMES[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

/** `"2026-09-29"` → `"29 sep 2026"`. Sin `Date`: no depende de la zona horaria. */
export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return iso;
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}
