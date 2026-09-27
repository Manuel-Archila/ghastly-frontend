/**
 * Gastos compartidos ("me deben"): solo online, sin tabla local. El pull
 * emite `receivable` pero se ignora. Editar/eliminar solo si está pendiente
 * (`RECEIVABLE_ALREADY_SETTLED` si ya se liquidó).
 */
import { api } from "@/data/api/client";

export interface ReceivableOut {
  id: string;
  transaction_id: string;
  counterparty: string;
  amount_cents: number;
  status: "pending" | "settled";
  settled_at: string | null;
  settlement_transaction_id: string | null;
}

export function listReceivables(): Promise<ReceivableOut[]> {
  return api.get("/receivables");
}

export function createReceivable(body: {
  id: string;
  transaction_id: string;
  counterparty: string;
  amount_cents: number;
}): Promise<ReceivableOut> {
  return api.post("/receivables", body);
}

export function updateReceivable(
  id: string,
  body: { counterparty?: string; amount_cents?: number },
): Promise<ReceivableOut> {
  return api.patch(`/receivables/${id}`, body);
}

export function deleteReceivable(id: string): Promise<void> {
  return api.delete(`/receivables/${id}`);
}

/**
 * Crea un ingreso real. `idempotencyKey`: una por intento, la MISMA en
 * los reintentos del mismo intento.
 */
export function settleReceivable(
  id: string,
  body: { id: string; account_id: string; date: string },
  idempotencyKey: string,
): Promise<ReceivableOut> {
  return api.post(`/receivables/${id}/settle`, body, { "Idempotency-Key": idempotencyKey });
}
