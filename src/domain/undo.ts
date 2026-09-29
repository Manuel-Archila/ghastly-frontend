/**
 * Qué hacer al "Deshacer" el borrado de un movimiento. El borrado es lógico y
 * local-first, pero la sync lo puede subir al servidor antes de que termine la
 * ventana de 5 s, así que hay dos situaciones distintas:
 *
 * - El borrado sigue pendiente en el outbox: basta con cancelarlo y quitarle el
 *   `deletedAt`. Es el mismo movimiento, con el mismo id, y el servidor nunca
 *   se entera.
 * - Ya se subió: el servidor lo tiene borrado, así que restaurar el mismo id
 *   chocaría (`DELETED_ON_SERVER`). Se vuelve a crear como movimiento nuevo.
 *   Eso solo es correcto si el movimiento no estaba ligado a nada más
 *   (transferencia, cuota, cobro, reembolso): recrearlo rompería el vínculo.
 */
export type RestorePlan = "already-active" | "cancel-pending-delete" | "recreate" | "impossible";

/** Resultado de un "Deshacer" ya ejecutado. */
export type RestoreOutcome = "restored" | "recreated" | "impossible";

/**
 * Decisión genérica, sin saber de qué entidad se trata. `canRecreate` dice si
 * volver a crearla como una nueva es correcto (no hay nada más ligado a ella).
 */
export function planRestore(input: {
  deletedAt: string | null;
  hasPendingDelete: boolean;
  canRecreate: boolean;
}): RestorePlan {
  if (!input.deletedAt) return "already-active";
  if (input.hasPendingDelete) return "cancel-pending-delete";
  return input.canRecreate ? "recreate" : "impossible";
}

export interface RestorableTransaction {
  deletedAt: string | null;
  kind: string;
  installmentId: string | null;
  receivableId: string | null;
  transferGroupId: string | null;
  refundOfId: string | null;
}

export function planTransactionRestore(
  txn: RestorableTransaction,
  hasPendingDelete: boolean,
): RestorePlan {
  const linked =
    txn.kind === "transfer" ||
    txn.installmentId !== null ||
    txn.receivableId !== null ||
    txn.transferGroupId !== null ||
    txn.refundOfId !== null;
  return planRestore({ deletedAt: txn.deletedAt, hasPendingDelete, canRecreate: !linked });
}
