import { create } from "zustand";

export interface ToastInput {
  message: string;
  /** Acción del toast, normalmente `Deshacer`. */
  actionLabel?: string;
  onAction?: () => void;
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
  dismiss: () => void;
}

const DEFAULT_DURATION_MS = 5000;
let nextId = 1;

/** Un toast a la vez: uno nuevo reemplaza al anterior en vez de apilarse. */
export const useToastStore = create<ToastStore>((set) => ({
  current: null,
  show: (toast) =>
    set({ current: { ...toast, id: nextId++, durationMs: toast.durationMs ?? DEFAULT_DURATION_MS } }),
  dismiss: () => set({ current: null }),
}));

/** Se llama desde cualquier lugar, sin hooks: `showToast({ message: "..." })`. */
export const showToast = (toast: ToastInput) => useToastStore.getState().show(toast);
