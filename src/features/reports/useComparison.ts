import { useQuery } from "@tanstack/react-query";

import { getComparison } from "@/data/api/reports";

export function useComparison(a: string, b: string) {
  const query = useQuery({
    queryKey: ["reports", "comparison", a, b],
    queryFn: () => getComparison(a, b),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
