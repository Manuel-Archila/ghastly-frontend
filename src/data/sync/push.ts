import { asc, eq, inArray, notInArray } from "drizzle-orm";

import { getAccountRemote } from "@/data/api/accounts";
import { getBudgetItemRemote } from "@/data/api/budgets";
import { api, ApiError } from "@/data/api/client";
import { getTransactionRemote } from "@/data/api/transactions";
import { db } from "@/data/db/client";
import { accounts, budgetItems, outboxMutations, transactions } from "@/data/db/schema";
import { softDelete } from "@/data/sync/pull";
import { getOrCreateDeviceId } from "@/lib/deviceId";

/**
 * Algunas mutaciones no van por `/sync/push` genérico porque el endpoint
 * REST dedicado hace más (transferencias = par atómico; reembolsos = ligan
 * `refund_of_id` que el schema de sync no acepta). Se mandan una por una a
 * su endpoint con Idempotency-Key.
 */
const RPC_ENTITIES: Record<string, (payload: Record<string, unknown>) => string> = {
  transfer: () => "/transactions/transfer",
  refund: (p) => `/transactions/${p.original_id as string}/refund`,
};

async function pushRpcEntries(): Promise<number> {
  const rows = await db
    .select()
    .from(outboxMutations)
    .where(inArray(outboxMutations.entityType, Object.keys(RPC_ENTITIES)));

  let sent = 0;
  for (const row of rows) {
    if (row.attempts >= MAX_ATTEMPTS) continue;
    const buildUrl = RPC_ENTITIES[row.entityType];
    const payload = row.payload as Record<string, unknown>;
    try {
      await api.post(buildUrl(payload), payload, { "Idempotency-Key": row.clientMutationId });
      await db
        .delete(outboxMutations)
        .where(eq(outboxMutations.clientMutationId, row.clientMutationId));
      sent += 1;
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        // Error de negocio (cuenta archivada, etc.): sacar del outbox,
        // no reintentar para siempre.
        await db
          .delete(outboxMutations)
          .where(eq(outboxMutations.clientMutationId, row.clientMutationId));
      } else {
        await db
          .update(outboxMutations)
          .set({ attempts: row.attempts + 1, lastError: e instanceof Error ? e.message : "error" })
          .where(eq(outboxMutations.clientMutationId, row.clientMutationId));
      }
    }
  }
  return sent;
}

interface SyncConflict {
  client_mutation_id: string;
  entity_id: string;
  reason: string;
}

interface SyncPushResponse {
  applied: string[];
  conflicts: SyncConflict[];
  next_seq: number;
}

/**
 * Conflictos de negocio: el servidor rechazó la mutación y NO se reintenta
 * (se saca del outbox). Como todo se escribió local-first, el estado local
 * quedó adelantado del servidor; hay que dejarlo igual que él:
 *  - `DELETED_ON_SERVER`: gana el delete → soft-delete local.
 *  - El resto (categoría repetida / no de gasto / inexistente) afecta a un
 *    ítem de presupuesto: se reconcilia contra el servidor (si el ítem no
 *    existe allá, se borra local; si existe, se restaura su estado).
 */
const BUDGET_ITEM_REJECTIONS = new Set([
  "BUDGET_ITEM_CATEGORY_TAKEN",
  "BUDGET_REQUIRES_EXPENSE_CATEGORY",
  "CATEGORY_NOT_FOUND",
]);

async function reconcileBudgetItem(itemId: string): Promise<void> {
  const local = (await db.select().from(budgetItems).where(eq(budgetItems.id, itemId)).limit(1))[0];
  if (!local) return;
  try {
    const remote = await getBudgetItemRemote(local.budgetId, itemId);
    await db
      .update(budgetItems)
      .set({
        categoryId: remote.category_id,
        amountCents: remote.amount_cents,
        sortOrder: remote.sort_order,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(budgetItems.id, itemId));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await softDelete("budget_item", itemId);
    }
    // Sin red: queda como está; el próximo pull/edición lo corrige.
  }
}

/** El monto local ya se editó de forma optimista (repositories/transactions.ts)
 * y ya movió el saldo de la cuenta; si el servidor lo rechaza, los dos
 * quedan mal hasta que se corrigen a mano contra el valor real. */
const TRANSACTION_AMOUNT_REJECTIONS = new Set([
  "TRANSFER_AMOUNT_EDIT_UNSUPPORTED",
  "INSTALLMENT_AMOUNT_LOCKED",
  "RECEIVABLE_AMOUNT_LOCKED",
  "DEBT_PAYMENT_AMOUNT_LOCKED",
  "GOAL_CONTRIBUTION_AMOUNT_LOCKED",
]);

async function reconcileTransaction(transactionId: string): Promise<void> {
  const local = (
    await db.select().from(transactions).where(eq(transactions.id, transactionId)).limit(1)
  )[0];
  if (!local) return;
  try {
    const remote = await getTransactionRemote(transactionId);
    await db
      .update(transactions)
      .set({
        amountCents: remote.amount_cents,
        baseAmountCents: remote.base_amount_cents,
        updatedAt: remote.updated_at,
      })
      .where(eq(transactions.id, transactionId));

    const accountRemote = await getAccountRemote(local.accountId);
    await db
      .update(accounts)
      .set({
        currentBalanceCents: accountRemote.current_balance_cents,
        updatedAt: accountRemote.updated_at,
      })
      .where(eq(accounts.id, local.accountId));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      await softDelete("transaction", transactionId);
    }
    // Sin red: queda como está; el próximo pull/edición lo corrige.
  }
}

async function handleConflicts(
  conflicts: SyncConflict[],
  entityTypeByMutation: Map<string, string>,
): Promise<void> {
  for (const c of conflicts) {
    const entityType = entityTypeByMutation.get(c.client_mutation_id);
    if (!entityType) continue;
    if (c.reason === "DELETED_ON_SERVER") {
      await softDelete(entityType, c.entity_id);
    } else if (entityType === "budget_item" && BUDGET_ITEM_REJECTIONS.has(c.reason)) {
      await reconcileBudgetItem(c.entity_id);
    } else if (entityType === "transaction" && TRANSACTION_AMOUNT_REJECTIONS.has(c.reason)) {
      await reconcileTransaction(c.entity_id);
    }
  }
}

const BATCH_SIZE = 200;
const MAX_ATTEMPTS = 5;

/** Empuja el outbox al servidor en lotes. Lo aplicado o en conflicto se
 * saca del outbox; lo que falló por red se deja con `attempts` +1 y
 * backoff — a los 5 fallos queda visible en Ajustes → Sincronización
 * (PLAN-frontend §3, §7). */
export async function pushOutbox(): Promise<{ applied: number; conflicts: number }> {
  const deviceId = await getOrCreateDeviceId();
  let totalApplied = await pushRpcEntries();
  let totalConflicts = 0;

  for (;;) {
    const batch = await db
      .select()
      .from(outboxMutations)
      .where(notInArray(outboxMutations.entityType, Object.keys(RPC_ENTITIES)))
      .orderBy(asc(outboxMutations.createdAt))
      .limit(BATCH_SIZE);

    const sendable = batch.filter((m) => m.attempts < MAX_ATTEMPTS);
    if (sendable.length === 0) break;

    const mutations = sendable.map((m) => ({
      client_mutation_id: m.clientMutationId,
      entity_type: m.entityType,
      entity_id: m.entityId,
      op: m.op,
      payload: m.payload,
      client_updated_at: m.clientUpdatedAt,
    }));

    let response: SyncPushResponse;
    try {
      response = await api.post<SyncPushResponse>("/sync/push", {
        device_id: deviceId,
        mutations,
      });
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "error de red";
      for (const m of sendable) {
        await db
          .update(outboxMutations)
          .set({ attempts: m.attempts + 1, lastError: message })
          .where(eq(outboxMutations.clientMutationId, m.clientMutationId));
      }
      break; // se reintenta en el próximo ciclo de sync
    }

    await handleConflicts(
      response.conflicts,
      new Map(sendable.map((m) => [m.clientMutationId, m.entityType])),
    );

    const resolved = new Set([
      ...response.applied,
      ...response.conflicts.map((c) => c.client_mutation_id),
    ]);
    for (const id of resolved) {
      await db.delete(outboxMutations).where(eq(outboxMutations.clientMutationId, id));
    }
    totalApplied += response.applied.length;
    totalConflicts += response.conflicts.length;

    if (sendable.length < BATCH_SIZE) break;
  }

  return { applied: totalApplied, conflicts: totalConflicts };
}
