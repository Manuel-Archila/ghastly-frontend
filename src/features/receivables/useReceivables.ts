/** Lista de "me deben": solo online, cacheada por React Query (sin tabla local). */
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listReceivables } from "@/data/api/receivables";

const KEY = ["receivables"] as const;

export function useReceivables() {
  const query = useQuery({ queryKey: KEY, queryFn: listReceivables });
  return {
    receivables: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useInvalidateReceivables() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: KEY }),
      // El total "Me deben" de Hoy sale del dashboard.
      client.invalidateQueries({ queryKey: ["reports", "dashboard"] }),
    ]);
}
