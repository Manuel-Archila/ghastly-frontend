/**
 * Reportes son de solo lectura y viven SOLO en el servidor — no se
 * replican a SQLite (mismo patrón que `data/api/budgets.ts` para
 * historial). Los tipos espejan `schemas/reports.py` del backend, en
 * snake_case tal cual viaja el JSON (no se traduce a camelCase).
 */
import { api } from "@/data/api/client";

export interface NetWorthOut {
  net_worth_cents: number;
}

export interface CashflowOut {
  income_cents: number;
  expense_cents: number;
  net_cents: number;
}

export interface TopCategoryOut {
  category_id: string;
  category_name: string;
  net_spent_cents: number;
}

export type UpcomingSourceType =
  | "installment"
  | "recurring"
  | "card_statement"
  | "card_payment"
  | "debt_payment";

export interface UpcomingItemOut {
  source_type: UpcomingSourceType;
  source_id: string;
  name: string;
  due_date: string;
  amount_cents: number;
}

export interface MonthAmountOut {
  month: string;
  amount_cents: number;
}

export interface InstallmentLiabilityOut {
  total_pending_cents: number;
  by_month: MonthAmountOut[];
}

export interface CategoryProgressOut {
  category_id: string;
  category_name: string;
  budgeted_cents: number;
  rollover_in_cents: number;
  spent_cents: number;
  available_cents: number;
  percent_consumed: number;
  projected_cents: number;
  suggested_daily_pace_cents: number;
}

export interface UnbudgetedCategoryOut {
  category_id: string;
  category_name: string;
  spent_cents: number;
}

export interface BudgetCurrentOut {
  month: string;
  is_closed: boolean;
  expected_income_cents: number | null;
  total_budgeted_cents: number;
  total_spent_cents: number;
  total_available_cents: number;
  global_limit_cents: number | null;
  global_projected_cents: number;
  items: CategoryProgressOut[];
  unbudgeted: UnbudgetedCategoryOut[];
}

export interface DashboardOut {
  month: string;
  net_worth: NetWorthOut;
  cashflow: CashflowOut;
  top_categories: TopCategoryOut[];
  budget: BudgetCurrentOut | null;
  upcoming: UpcomingItemOut[];
  installment_liability: InstallmentLiabilityOut;
  receivable_cents: number;
}

export interface CategoryAnomalyOut {
  category_id: string;
  category_name: string;
  current_cents: number;
  average_cents: number;
  percent_increase: number;
}

export interface AnomaliesOut {
  month: string;
  items: CategoryAnomalyOut[];
}

export function getDashboard(month?: string): Promise<DashboardOut> {
  return api.get(`/reports/dashboard${month ? `?month=${month}` : ""}`);
}

export function getAnomalies(month?: string): Promise<AnomaliesOut> {
  return api.get(`/reports/anomalies${month ? `?month=${month}` : ""}`);
}
