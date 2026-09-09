/**
 * Pantalla Hoy: el wireframe pide "una sola llamada" a `/reports/dashboard`,
 * pero ese endpoint no trae anomalías (`DashboardOut` no las incluye) y el
 * bloque "gastaste 40% más en X" del wireframe las necesita. Se resuelve
 * con una segunda llamada en paralelo a `/reports/anomalies` — ambas
 * cacheadas por React Query, el costo real es despreciable.
 */
import { useQuery } from "@tanstack/react-query";

import { getAnomalies, getDashboard } from "@/data/api/reports";

export function useDashboard(month?: string) {
  const key = month ?? "current";

  const dashboard = useQuery({
    queryKey: ["reports", "dashboard", key],
    queryFn: () => getDashboard(month),
  });

  const anomalies = useQuery({
    queryKey: ["reports", "anomalies", key],
    queryFn: () => getAnomalies(month),
  });

  return {
    dashboard: dashboard.data,
    anomalies: anomalies.data?.items ?? [],
    isLoading: dashboard.isLoading || anomalies.isLoading,
    isError: dashboard.isError,
    error: dashboard.error,
    refetch: () => Promise.all([dashboard.refetch(), anomalies.refetch()]),
  };
}
