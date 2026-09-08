import { useEffect } from "react";
import { AppState } from "react-native";

import { runSync } from "@/data/sync";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Dispara un sync pronto (debounced 1.5s). Se llama después de cada
 * escritura local — la UI ya se actualizó, esto solo empuja en segundo
 * plano. Nunca bloquea nada (PLAN-frontend §3).
 */
export function triggerSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void runSync().catch(() => {
      // el outbox reintenta solo con backoff; no hay nada que hacer acá
    });
  }, 1500);
}

/** Sincroniza al abrir la app y cada vez que vuelve a primer plano
 * (solo mientras haya sesión). */
export function useSyncOnForeground(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void runSync().catch(() => {});
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void runSync().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [enabled]);
}
