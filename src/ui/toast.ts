import { create } from "zustand";

export interface ToastInput {
  message: string;
  /** Acción del toast, normalmente `Deshacer`. */
  actionLabel?: string;
  onAction?: () => void;
  /** Se llama cuando el toast termina SIN que se toque la acción: expiró, o lo
   * reemplazó otro toast. Sirve para "confirmar" lo que quedó pendiente (por
   * ejemplo, subir un borrado a la sync cuando ya no se puede deshacer). */
  onExpire?: () => void;
  /** CLAUDE.md: todo borrado ofrece Deshacer 5 s. */
  durationMs?: number;
}

export interface ToastItem extends ToastInput {
  id: number;
  durationMs: number;
}

interface ToastStore {
  current: ToastItem | null;
  show: (toast: ToastInput) => void;
  /** Cierra sin llamar `onExpire` (se tocó la acción). */
  dismiss: () => void;
  /** Cierra porque se acabó el tiempo: llama `onExpire`. */
  expire: () => void;
}

const DEFAULT_DURATION_MS = 5000;
let nextId = 1;

/** Un toast a la vez: uno nuevo reemplaza al anterior en vez de apilarse. Si el
 * anterior tenía algo pendiente (`onExpire`), se confirma antes de reemplazarlo. */
export const useToastStore = create<ToastStore>((set, get) => ({
  current: null,
  show: (toast) => {
    get().current?.onExpire?.();
    set({ current: { ...toast, id: nextId++, durationMs: toast.durationMs ?? DEFAULT_DURATION_MS } });
  },
  dismiss: () => set({ current: null }),
  expire: () => {
    const current = get().current;
    if (!current) return;
    set({ current: null });
    current.onExpire?.();
  },
}));

/** Se llama desde cualquier lugar, sin hooks: `showToast({ message: "..." })`. */
export const showToast = (toast: ToastInput) => useToastStore.getState().show(toast);
