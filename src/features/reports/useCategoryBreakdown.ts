import { useQuery } from "@tanstack/react-query";

import { getByCategory } from "@/data/api/reports";

export function useCategoryBreakdown(from: string, to: string, kind: "expense" | "income") {
  const query = useQuery({
    queryKey: ["reports", "by-category", from, to, kind],
    queryFn: () => getByCategory(from, to, kind),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
