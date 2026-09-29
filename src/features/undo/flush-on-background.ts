import { AppState } from "react-native";

import { flushPendingDeletes } from "./deferred-delete";

/**
 * Al pasar a segundo plano se confirman los borrados que seguían esperando su
 * ventana de Deshacer: el JS puede pausarse o morir ahí y el borrado se
 * perdería. Devuelve la función que quita el listener.
 */
export function installBackgroundFlush(): () => void {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "background") void flushPendingDeletes();
  });
  return () => subscription.remove();
}
