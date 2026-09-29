import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Estado de "Reducir movimiento" del sistema, en vivo. Es el único lugar que
 * consulta `AccessibilityInfo`: una sola suscripción para toda la app (hay
 * decenas de Button/Chip montados a la vez, cada uno con su propio listener
 * sería desperdicio).
 *
 * Arranca en `false` hasta que llega la primera respuesta del sistema.
 */
let reduced = false;
const listeners = new Set<() => void>();
let started = false;

function set(next: boolean) {
  if (next === reduced) return;
  reduced = next;
  listeners.forEach((l) => l());
}

function start() {
  if (started) return;
  started = true;
  void AccessibilityInfo.isReduceMotionEnabled().then(set);
  AccessibilityInfo.addEventListener("reduceMotionChanged", set);
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => reduced,
    () => false,
  );
}
