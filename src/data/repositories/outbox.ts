import { eq } from "drizzle-orm";

import { db } from "@/data/db/client";
import { outboxMutations } from "@/data/db/schema";
import { MAX_ATTEMPTS as MAX_OUTBOX_ATTEMPTS } from "@/data/sync/push";

export type OutboxMutation = typeof outboxMutations.$inferSelect;

// Reexportado con el mismo nombre que ya usa settings/sync.tsx: a partir de
// este número de intentos fallidos la mutación deja de reintentarse sola y
// se queda en el buzón para siempre, sin ningún aviso — esta pantalla es la
// única forma de verla y desatascarla.
export { MAX_OUTBOX_ATTEMPTS };

/** Todo lo que el teléfono todavía no confirmó que el servidor recibió —
 * desde lo recién encolado (attempts=0, le toca en el próximo sync) hasta
 * lo que ya se quedó atascado (attempts >= MAX_OUTBOX_ATTEMPTS). */
export async function listPendingOutbox(): Promise<OutboxMutation[]> {
  return db.select().from(outboxMutations).orderBy(outboxMutations.createdAt);
}

/** Vuelve a intentar una mutación atascada: resetea sus intentos a cero para
 * que pushOutbox() (data/sync/push.ts) la vuelva a tomar en el próximo sync.
 * No sincroniza ella sola — solo le quita el freno. */
export async function resetOutboxAttempts(clientMutationId: string): Promise<void> {
  await db
    .update(outboxMutations)
    .set({ attempts: 0, lastError: null })
    .where(eq(outboxMutations.clientMutationId, clientMutationId));
}

/** Descarta una mutación sin reintentarla más — para cuando el error es
 * permanente (un dato que ya no aplica) y seguir intentando no sirve de nada. */
export async function discardOutboxMutation(clientMutationId: string): Promise<void> {
  await db.delete(outboxMutations).where(eq(outboxMutations.clientMutationId, clientMutationId));
}

const ENTITY_LABELS: Record<string, string> = {
  account: "Cuenta",
  category: "Categoría",
  transaction: "Movimiento",
  budget: "Presupuesto",
  budget_item: "Ítem de presupuesto",
  transfer: "Transferencia",
  refund: "Reembolso",
};

export function outboxEntityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

const OP_LABELS: Record<string, string> = {
  upsert: "Guardar",
  delete: "Eliminar",
};

export function outboxOpLabel(op: string): string {
  return OP_LABELS[op] ?? op;
}
