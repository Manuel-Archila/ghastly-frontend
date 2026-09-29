import {
  deleteTransactionLocally,
  restoreDeletedTransactionLocally,
} from "@/data/repositories/transactions";
import { triggerSync } from "@/features/sync/sync-manager";
import { showToast } from "@/ui/toast";

/**
 * Borra un movimiento y ofrece `Deshacer` 5 s (CLAUDE.md, "Deshacer").
 *
 * El borrado es inmediato y local: la lista y el saldo ya lo reflejan. Lo único
 * que se retiene es la SUBIDA al servidor: `triggerSync()` no se llama al borrar
 * sino cuando el toast expira, así que deshacer dentro de la ventana casi
 * siempre solo cancela una mutación pendiente y el servidor nunca se entera.
 * (Otra sync —al volver a primer plano— podría subirlo antes: en ese caso el
 * repositorio recrea el movimiento; ver `domain/undo.ts`.)
 */
export async function deleteTransactionWithUndo(id: string): Promise<void> {
  await deleteTransactionLocally(id);
  showToast({
    message: "Movimiento eliminado",
    actionLabel: "Deshacer",
    onAction: () => void undoDelete(id),
    onExpire: triggerSync,
  });
}

async function undoDelete(id: string): Promise<void> {
  try {
    const outcome = await restoreDeletedTransactionLocally(id);
    if (outcome === "impossible") {
      showToast({ message: "Este movimiento ya no se puede recuperar." });
      return;
    }
    // Recreado o restaurado: hay algo nuevo que subir (o nada, si solo se canceló).
    triggerSync();
  } catch {
    showToast({ message: "No se pudo deshacer. Intentá de nuevo." });
  }
}
