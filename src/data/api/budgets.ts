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

// ── Ítems (REST) ─ útiles para reconciliar; el flujo normal es local-first.

/** Advertencia no bloqueante del servidor (hijos > tope del padre). */
export interface BudgetItemWarning {
  code: "CHILDREN_EXCEED_PARENT";
  message: string;
  parent_item_id: string;
  parent_category_id: string;
  parent_cents: number;
  children_cents: number;
  excess_cents: number;
}

export interface BudgetItemOut {
  id: string;
  budget_id: string;
  category_id: string;
  amount_cents: number;
  rollover_enabled: boolean | null;
  sort_order: number;
  warning?: BudgetItemWarning | null;
}

export function listBudgetItemsRemote(budgetId: string): Promise<BudgetItemOut[]> {
  return api.get(`/budgets/${budgetId}/items`);
}

export function getBudgetItemRemote(budgetId: string, itemId: string): Promise<BudgetItemOut> {
  return api.get(`/budgets/${budgetId}/items/${itemId}`);
}

export function addBudgetItemRemote(
  budgetId: string,
  body: { id: string; category_id: string; amount_cents: number; rollover_enabled?: boolean | null },
): Promise<BudgetItemOut> {
  return api.post(`/budgets/${budgetId}/items`, body);
}

export function patchBudgetItemRemote(
  budgetId: string,
  itemId: string,
  body: { category_id?: string; amount_cents?: number; rollover_enabled?: boolean | null },
): Promise<BudgetItemOut> {
  return api.patch(`/budgets/${budgetId}/items/${itemId}`, body);
}

export function deleteBudgetItemRemote(budgetId: string, itemId: string): Promise<void> {
  return api.delete(`/budgets/${budgetId}/items/${itemId}`);
}

/** Reabre un mes cerrado (solo el más reciente). El mes vuelve a calcularse en vivo. */
export function reopenBudgetPeriod(budgetId: string, month: string): Promise<void> {
  return api.delete(`/budgets/${budgetId}/periods/${month}`);
}
