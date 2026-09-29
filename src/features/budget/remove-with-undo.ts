import { removeBudgetItemLocally, restoreBudgetItemLocally } from "@/data/repositories/budgets";
import { triggerSync } from "@/features/sync/sync-manager";
import { showToast } from "@/ui/toast";

/**
 * Quita una categoría del presupuesto y ofrece `Deshacer` 5 s (CLAUDE.md).
 * Misma mecánica que `deleteTransactionWithUndo`: el borrado es local e
 * inmediato y solo se retiene la SUBIDA al servidor hasta que el aviso expira.
 *
 * `onRestored` recibe el id vigente del ítem (cambia si hubo que recrearlo)
 * para que la pantalla que lo está editando lo vuelva a mostrar.
 */
export async function removeBudgetItemWithUndo(
  itemId: string,
  categoryName: string,
  onRestored: (itemId: string) => void,
): Promise<void> {
  await removeBudgetItemLocally(itemId);
  showToast({
    message: `${categoryName} salió del presupuesto`,
    actionLabel: "Deshacer",
    onAction: () => void undoRemove(itemId, onRestored),
    onExpire: triggerSync,
  });
}

async function undoRemove(itemId: string, onRestored: (itemId: string) => void): Promise<void> {
  try {
    const result = await restoreBudgetItemLocally(itemId);
    if (result.outcome === "impossible") {
      showToast({ message: "Esa categoría ya no se puede volver a agregar." });
      return;
    }
    onRestored(result.itemId);
    triggerSync();
  } catch {
    showToast({ message: "No se pudo deshacer. Intentá de nuevo." });
  }
}
