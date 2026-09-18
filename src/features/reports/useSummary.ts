/**
 * Reportes → Resumen: patrimonio neto (12 meses), tasa de ahorro (12 meses)
 * e ingreso/gasto del mes en curso — tres llamadas en paralelo, mismo
 * patrón que `useDashboard.ts`.
 */
import { useQuery } from "@tanstack/react-query";

import { getCashflowSeries, getNetWorthHistory, getSavingsRate } from "@/data/api/reports";

function currentMonthBounds(): { from: string; to: string } {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function useSummary() {
  const netWorth = useQuery({
    queryKey: ["reports", "net-worth", 12],
    queryFn: () => getNetWorthHistory(12),
  });

  const savingsRate = useQuery({
    queryKey: ["reports", "savings-rate", 12],
    queryFn: () => getSavingsRate(12),
  });

  const { from, to } = currentMonthBounds();
  const cashflow = useQuery({
    queryKey: ["reports", "cashflow", from, to],
    queryFn: () => getCashflowSeries(from, to, "month"),
  });

  return {
    netWorth: netWorth.data,
    savingsRate: savingsRate.data,
    currentMonth: cashflow.data?.periods[0],
    isLoading: netWorth.isLoading || savingsRate.isLoading || cashflow.isLoading,
    isError: netWorth.isError || savingsRate.isError || cashflow.isError,
    refetch: () => Promise.all([netWorth.refetch(), savingsRate.refetch(), cashflow.refetch()]),
  };
}
