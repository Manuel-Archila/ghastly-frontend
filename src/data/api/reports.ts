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
  currency: string;
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

export interface CategoryBreakdownItemOut {
  category_id: string;
  category_name: string;
  amount_cents: number;
  percent_of_total: number;
}

export interface CategoryBreakdownOut {
  kind: "expense" | "income";
  from_date: string;
  to_date: string;
  total_cents: number;
  items: CategoryBreakdownItemOut[];
}

export interface CashflowPeriodOut {
  period_start: string;
  income_cents: number;
  expense_cents: number;
  net_cents: number;
}

export interface CashflowSeriesOut {
  granularity: "month" | "week";
  from_date: string;
  to_date: string;
  periods: CashflowPeriodOut[];
}

export interface NetWorthHistoryOut {
  months: number;
  points: MonthAmountOut[];
}

export interface TrendsOut {
  months: number;
  periods: CashflowPeriodOut[];
  avg_income_with_extraordinary_cents: number;
  avg_income_recurring_cents: number;
}

export interface CategoryComparisonItemOut {
  category_id: string;
  category_name: string;
  a_amount_cents: number;
  b_amount_cents: number;
  delta_cents: number;
  percent_change: number | null;
}

export interface ComparisonOut {
  a_month: string;
  b_month: string;
  a_income_cents: number;
  a_expense_cents: number;
  b_income_cents: number;
  b_expense_cents: number;
  income_change_percent: number | null;
  expense_change_percent: number | null;
  categories: CategoryComparisonItemOut[];
}

export interface SavingsRatePointOut {
  month: string;
  income_cents: number;
  expense_cents: number;
  savings_rate_percent: number | null;
}

export interface SavingsRateOut {
  months: number;
  points: SavingsRatePointOut[];
}

export function getDashboard(month?: string): Promise<DashboardOut> {
  return api.get(`/reports/dashboard${month ? `?month=${month}` : ""}`);
}

export function getAnomalies(month?: string): Promise<AnomaliesOut> {
  return api.get(`/reports/anomalies${month ? `?month=${month}` : ""}`);
}

export function getByCategory(
  from: string,
  to: string,
  kind: "expense" | "income" = "expense",
): Promise<CategoryBreakdownOut> {
  return api.get(`/reports/by-category?from=${from}&to=${to}&kind=${kind}`);
}

export function getCashflowSeries(
  from: string,
  to: string,
  granularity: "month" | "week" = "month",
): Promise<CashflowSeriesOut> {
  return api.get(`/reports/cashflow?from=${from}&to=${to}&granularity=${granularity}`);
}

export function getNetWorthHistory(months = 12): Promise<NetWorthHistoryOut> {
  return api.get(`/reports/net-worth?months=${months}`);
}

export function getTrends(months = 6): Promise<TrendsOut> {
  return api.get(`/reports/trends?months=${months}`);
}

export function getComparison(a: string, b: string): Promise<ComparisonOut> {
  return api.get(`/reports/comparison?a=${a}&b=${b}`);
}

export function getSavingsRate(months = 12): Promise<SavingsRateOut> {
  return api.get(`/reports/savings-rate?months=${months}`);
}
