/**
 * Igual que `features/reports/useDashboard.ts`: dato de solo servidor,
 * cacheado con React Query. `save` no usa `useMutation` — es un PATCH
 * chico de un formulario de Ajustes, no hace falta el estado extra.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferencesOut,
  type NotificationPreferencesPatch,
} from "@/data/api/notifications";

const QUERY_KEY = ["notification-preferences"];

export function useNotificationPreferences() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getNotificationPreferences,
  });

  async function save(patch: NotificationPreferencesPatch): Promise<NotificationPreferencesOut> {
    const updated = await updateNotificationPreferences(patch);
    queryClient.setQueryData(QUERY_KEY, updated);
    return updated;
  }

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    save,
  };
}
