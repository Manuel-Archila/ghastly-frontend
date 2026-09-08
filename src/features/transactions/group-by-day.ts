import type { TransactionListItem } from "@/data/repositories/transactions";

export interface DaySection {
  title: string;
  isoDate: string;
  totalCents: number;
  data: TransactionListItem[];
}

function signedForTotal(item: TransactionListItem): number {
  if (item.kind === "transfer") return 0; // las transferencias no cuentan (regla 1)
  return item.kind === "income" ? item.amountCents : -item.amountCents;
}

function labelForDate(isoDate: string, today: string): string {
  if (isoDate === today) return "Hoy";
  const yesterday = new Date(new Date(today).getTime() - 86_400_000).toISOString().slice(0, 10);
  if (isoDate === yesterday) return "Ayer";
  const d = new Date(`${isoDate}T00:00:00`);
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
}

/** Agrupa por día, con encabezado y total del día a la derecha (PLAN-frontend §6.3). */
export function groupByDay(items: TransactionListItem[], today: string): DaySection[] {
  const byDate = new Map<string, TransactionListItem[]>();
  for (const item of items) {
    const bucket = byDate.get(item.date) ?? [];
    bucket.push(item);
    byDate.set(item.date, bucket);
  }
  return [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([isoDate, data]) => ({
      isoDate,
      title: labelForDate(isoDate, today),
      totalCents: data.reduce((sum, i) => sum + signedForTotal(i), 0),
      data,
    }));
}
