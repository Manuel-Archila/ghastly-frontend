/**
 * Solo lo que hace falta para reconciliar contra el servidor cuando un
 * conflicto de sync deja el estado optimista local desincronizado
 * (push.ts::reconcileTransaction). El resto de la escritura de
 * transacciones va por el outbox (data/repositories/transactions.ts).
 */
import { api } from "@/data/api/client";

export interface TransactionRemote {
  id: string;
  account_id: string;
  amount_cents: number;
  base_amount_cents: number | null;
  updated_at: string;
}

export function getTransactionRemote(id: string): Promise<TransactionRemote> {
  return api.get(`/transactions/${id}`);
}
