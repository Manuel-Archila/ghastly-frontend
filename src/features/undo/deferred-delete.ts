import { useCallback } from "react";
import { create } from "zustand";

import { errorMessageFor } from "@/data/api/error-messages";
import { showToast } from "@/ui/toast";

/**
 * "Deshacer" para borrados que van por API y NO tienen restauración en el
 * servidor. En vez de restaurar, no se llama al API hasta que el aviso expira:
 * el elemento se oculta de las listas al instante y, si se toca Deshacer, solo
 * se cancela la llamada pendiente. El servidor nunca se entera.
 *
 * Si el borrado sale bien, el elemento SIGUE oculto (no se "des-oculta"): la
 * lista que está abierta tiene el registro viejo en memoria y lo volvería a
 * mostrar hasta recargarse. Si falla, se vuelve a mostrar y se avisa.
 *
 * Limitación conocida: si la app muere dentro de la ventana de 5 s, el borrado
 * no ocurre (falla del lado seguro: el elemento reaparece). Al pasar a segundo
 * plano se confirma todo lo pendiente (`flushPendingDeletes`).
 */

interface DeferredState {
  hidden: ReadonlySet<string>;
  /** Sube cuando un borrado termina bien, para que las listas se recarguen. */
  version: number;
}

export const useDeferredDeleteStore = create<DeferredState>(() => ({
  hidden: new Set<string>(),
  version: 0,
}));

const keyOf = (entity: string, id: string) => `${entity}:${id}`;

function hide(key: string) {
  useDeferredDeleteStore.setState((s) => ({ hidden: new Set(s.hidden).add(key) }));
}

function unhide(key: string) {
  useDeferredDeleteStore.setState((s) => {
    const next = new Set(s.hidden);
    next.delete(key);
    return { hidden: next };
  });
}

function bumpVersion() {
  useDeferredDeleteStore.setState((s) => ({ version: s.version + 1 }));
}

/** Borrados pendientes de confirmar, por clave. */
const pending = new Map<string, () => Promise<void>>();

export interface DeferredDeleteOptions {
  /** Tipo de entidad ("template", "account"…): agrupa las claves ocultas. */
  entity: string;
  id: string;
  /** Texto del aviso: "Plantilla eliminada". */
  message: string;
  /** La llamada real. Se ejecuta al expirar el aviso, nunca antes. */
  perform: () => Promise<unknown>;
  /** Respaldo si el servidor falla con un código que no conocemos. */
  failureMessage?: string;
}

export function deferDelete(options: DeferredDeleteOptions): void {
  const key = keyOf(options.entity, options.id);
  let settled = false;

  const finalize = async () => {
    if (settled) return;
    settled = true;
    pending.delete(key);
    try {
      await options.perform();
      bumpVersion();
    } catch (e) {
      unhide(key);
      bumpVersion();
      showToast({ message: errorMessageFor(e, options.failureMessage ?? "No se pudo eliminar.") });
    }
  };

  hide(key);
  pending.set(key, finalize);
  showToast({
    message: options.message,
    actionLabel: "Deshacer",
    onAction: () => {
      if (settled) return;
      settled = true;
      pending.delete(key);
      unhide(key);
    },
    onExpire: () => void finalize(),
  });
}

/** Confirma ya todo lo pendiente (la app pasa a segundo plano). */
export async function flushPendingDeletes(): Promise<void> {
  await Promise.all([...pending.values()].map((finalize) => finalize()));
}

/** `(entity, id) => true` si ese elemento está oculto por un borrado pendiente o ya hecho. */
export function useIsHiddenByDelete(): (entity: string, id: string) => boolean {
  const hidden = useDeferredDeleteStore((s) => s.hidden);
  return useCallback((entity, id) => hidden.has(keyOf(entity, id)), [hidden]);
}

/** Cambia cada vez que termina un borrado: úsalo como dependencia para recargar. */
export function useDeleteVersion(): number {
  return useDeferredDeleteStore((s) => s.version);
}
