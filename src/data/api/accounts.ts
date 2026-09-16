/**
 * Borrar una cuenta es en realidad archivarla (CLAUDE.md: "borrado lógico
 * ... archivado en cuentas", sin borrado físico). A diferencia de crear
 * una cuenta (que va por el outbox, `data/repositories/accounts.ts`),
 * esto pega directo al servidor — como `closeBudgetPeriod` en
 * `data/api/budgets.ts` — porque necesitamos la respuesta síncrona: si
 * la cuenta tiene saldo distinto de cero, el backend devuelve 409
 * `ACCOUNT_HAS_BALANCE` y hay que poder ofrecer "¿archivar igual?" ahí
 * mismo, no en un sync en segundo plano.
 */
import { api } from "@/data/api/client";

export function deleteAccount(id: string, force = false): Promise<void> {
  return api.delete(`/accounts/${id}${force ? "?force=true" : ""}`);
}
