/**
 * Historial y cierre de período viven SOLO en el servidor: `budget_periods`
 * es historia congelada (regla 11) y no se replica al SQLite local. La
 * pantalla de historial los pide en línea; el cierre es una acción mensual.
 */
import { api } from "@/data/api/client";

export interface HistoryCategory {
  category_id: string;
  category_name: string;
  budgeted_cents: number;
  rollover_in_cents: number;
  spent_cents: number;
  available_cents: number;
  percent_consumed: number;
}

export interface HistoryPeriod {
  month: string;
  closed_at: string;
  items: HistoryCategory[];
}

export function getBudgetHistory(budgetId: string): Promise<{ periods: HistoryPeriod[] }> {
  return api.get(`/budgets/${budgetId}/history`);
}

export function closeBudgetPeriod(
  budgetId: string,
  month?: string,
): Promise<{ month: string; items: HistoryCategory[] }> {
  const query = month ? `?month=${month}` : "";
  return api.post(`/budgets/${budgetId}/close-period${query}`);
}
