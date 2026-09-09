/**
 * Primer uso real de React Query en el repo (estaba instalado pero sin
 * usar) — capa de caché/refetch para pantallas de solo lectura contra el
 * servidor (reportes, historial de presupuesto). No reemplaza SQLite: las
 * escrituras siguen siendo local-first con outbox.
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Los reportes no cambian por fuera de esta app; evita refetch en
      // cada foco de pantalla. Pull-to-refresh y sync siguen invalidando
      // manualmente cuando hace falta.
      staleTime: 60_000,
      retry: 1,
    },
  },
});
