/** Plantillas de gasto: solo online, cacheadas por React Query. */
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listTemplates } from "@/data/api/templates";
import { saveCachedTemplates } from "@/lib/templateCache";

const KEY = ["templates"] as const;

export function useTemplates() {
  const query = useQuery({ queryKey: KEY, queryFn: async () => {
      const fresh = await listTemplates();
      void saveCachedTemplates(fresh); // alimenta los chips de la captura rápida
      return fresh;
    } });
  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useInvalidateTemplates() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: KEY });
}
