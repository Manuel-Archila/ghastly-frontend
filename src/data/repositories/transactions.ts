import { and, desc, eq, gte, isNull, like, lte, or, sql } from "drizzle-orm";

import { db } from "@/data/db/client";
import { accounts, categories, outboxMutations, transactions } from "@/data/db/schema";
import { signedDelta, type AccountType } from "@/domain/balances";
import { Money } from "@/domain/money";
import { uuidv7 } from "@/lib/uuid";

export type Transaction = typeof transactions.$inferSelect;

export interface TransactionListItem extends Transaction {
  categoryName: string | null;
  accountName: string | null;
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId: string | null;
  kind: "expense" | "income";
  amountCents: number;
  date: string; // YYYY-MM-DD
  description?: string | null;
  /** Sigue la moneda de la cuenta elegida — no es un campo libre en la UI
   * (evitamos el caso raro, que el backend permite pero rompería el saldo
   * de la cuenta, de una transacción en otra moneda que la de su cuenta). */
  currency?: string;
  /** Requerida por el backend si `currency` no es GTQ (caso 4) — se congela,
   * nunca se recalcula. */
  fxRate?: number;
  /** Si nace de una plantilla: el servidor solo incrementa su `use_count`. */
  templateId?: string;
}

async function applyBalanceDelta(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  accountId: string,
  kind: "expense" | "income" | "transfer",
  amountCents: number,
  transferDirection: "in" | "out" | null,
  now: string,
): Promise<void> {
  const rows = await tx.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  const account = rows[0];
  if (!account) return;
  const delta = signedDelta(
    { kind, amountCents, transferDirection },
    account.type as AccountType,
  );
  await tx
    .update(accounts)
    .set({ currentBalanceCents: account.currentBalanceCents + delta, updatedAt: now })
    .where(eq(accounts.id, accountId));
}

/**
 * Escribe el movimiento en SQLite y encola la mutación en el outbox, todo
 * en una transacción de DB. La UI se actualiza al instante (PLAN-frontend §3).
 */
export async function createTransactionLocally(input: CreateTransactionInput): Promise<string> {
  const id = uuidv7();
  const now = new Date().toISOString();
  const currency = input.currency ?? "GTQ";
  // Optimista: el servidor es quien de verdad congela esto (caso 4), pero
  // calculamos ya mismo con la misma tasa para que el presupuesto/dashboard
  // LOCAL (domain/budget.ts vía repositories/budgets.ts) no muestren mal
  // hasta el próximo sync — mismo criterio que el saldo optimista de abajo.
  const baseAmountCents =
    currency !== "GTQ" && input.fxRate
      ? new Money(input.amountCents, currency).convert(input.fxRate, "GTQ").cents
      : null;

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      id,
      accountId: input.accountId,
      categoryId: input.categoryId,
      kind: input.kind,
      amountCents: input.amountCents,
      currency,
      fxRate: input.fxRate ?? null,
      baseAmountCents,
      date: input.date,
      description: input.description ?? null,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    await applyBalanceDelta(tx, input.accountId, input.kind, input.amountCents, null, now);
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "transaction",
      entityId: id,
      op: "upsert",
      payload: {
        id,
        account_id: input.accountId,
        category_id: input.categoryId,
        kind: input.kind,
        amount_cents: input.amountCents,
        currency,
        fx_rate: input.fxRate ?? undefined,
        date: input.date,
        description: input.description ?? null,
        ...(input.templateId ? { template_id: input.templateId } : {}),
      },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });

  return id;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  date: string;
  description?: string | null;
}

/**
 * Una transferencia son dos filas atómicas ligadas por `transfer_group_id`.
 * El backend NO acepta crearla por `/sync/push` genérico (rompería el par),
 * así que el outbox lleva UNA entrada `transfer` y `sync/push.ts` la manda
 * a `POST /transactions/transfer`.
 */
export async function createTransferLocally(input: CreateTransferInput): Promise<string> {
  const groupId = uuidv7();
  const outId = uuidv7();
  const inId = uuidv7();
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    for (const [id, accountId, direction] of [
      [outId, input.fromAccountId, "out"] as const,
      [inId, input.toAccountId, "in"] as const,
    ]) {
      await tx.insert(transactions).values({
        id,
        accountId,
        kind: "transfer",
        amountCents: input.amountCents,
        currency: "GTQ",
        date: input.date,
        description: input.description ?? null,
        transferGroupId: groupId,
        transferDirection: direction,
        tags: [],
        createdAt: now,
        updatedAt: now,
      });
      await applyBalanceDelta(tx, accountId, "transfer", input.amountCents, direction, now);
    }
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "transfer",
      entityId: groupId,
      op: "upsert",
      payload: {
        out_transaction_id: outId,
        in_transaction_id: inId,
        from_account_id: input.fromAccountId,
        to_account_id: input.toAccountId,
        amount_cents: input.amountCents,
        date: input.date,
        description: input.description ?? null,
      },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });

  return groupId;
}

export interface UpdateTransactionInput {
  categoryId?: string | null;
  date?: string;
  description?: string | null;
  merchant?: string | null;
  notes?: string | null;
}

export async function updateTransactionLocally(
  id: string,
  patch: UpdateTransactionInput,
): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.update(transactions).set({ ...patch, updatedAt: now }).where(eq(transactions.id, id));
    const payload: Record<string, unknown> = {};
    if (patch.categoryId !== undefined) payload.category_id = patch.categoryId;
    if (patch.date !== undefined) payload.date = patch.date;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.merchant !== undefined) payload.merchant = patch.merchant;
    if (patch.notes !== undefined) payload.notes = patch.notes;
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "transaction",
      entityId: id,
      op: "upsert",
      payload,
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
}

/**
 * Reembolso (caso de negocio 2): crea un `income` ligado al gasto original
 * por `refundOfId`, en la misma categoría. En reportes resta del gasto de
 * esa categoría (no suma a ingresos) — eso lo hace el backend. El outbox
 * lleva una entrada `refund` que `sync/push.ts` manda a
 * `POST /transactions/{original}/refund`.
 */
export async function createRefundLocally(
  original: Transaction,
  amountCents?: number,
): Promise<string> {
  const refundId = uuidv7();
  const now = new Date().toISOString();
  const amount = amountCents ?? original.amountCents;
  const dateIso = now.slice(0, 10);

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      id: refundId,
      accountId: original.accountId,
      categoryId: original.categoryId,
      kind: "income",
      amountCents: amount,
      currency: original.currency,
      date: dateIso,
      description: original.description ? `Reembolso: ${original.description}` : "Reembolso",
      refundOfId: original.id,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    await applyBalanceDelta(tx, original.accountId, "income", amount, null, now);
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "refund",
      entityId: refundId,
      op: "upsert",
      payload: {
        original_id: original.id,
        id: refundId,
        amount_cents: amount,
        date: dateIso,
      },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });

  return refundId;
}

export async function deleteTransactionLocally(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    const txn = rows[0];
    if (txn && !txn.deletedAt && txn.kind !== "transfer") {
      // Revertir el saldo optimista: el gasto/ingreso deja de contar.
      const reverseKind = txn.kind === "expense" ? "income" : "expense";
      await applyBalanceDelta(
        tx,
        txn.accountId,
        reverseKind as "expense" | "income",
        txn.amountCents,
        null,
        now,
      );
    }
    await tx.update(transactions).set({ deletedAt: now, updatedAt: now }).where(eq(transactions.id, id));
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "transaction",
      entityId: id,
      op: "delete",
      payload: { id },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
}

export interface TransactionFilters {
  search?: string;
  kind?: "expense" | "income" | "transfer";
  from?: string;
  to?: string;
  categoryId?: string;
}

export async function listTransactions(
  filters: TransactionFilters = {},
  limit = 100,
): Promise<TransactionListItem[]> {
  const conditions = [isNull(transactions.deletedAt)];
  if (filters.kind) conditions.push(eq(transactions.kind, filters.kind));
  if (filters.from) conditions.push(gte(transactions.date, filters.from));
  if (filters.to) conditions.push(lte(transactions.date, filters.to));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.search) {
    const q = `%${filters.search.toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${transactions.description})`, q),
        like(sql`lower(${transactions.merchant})`, q),
      )!,
    );
  }

  const rows = await db
    .select({
      txn: transactions,
      categoryName: categories.name,
      accountName: accounts.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(...conditions))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);

  return rows.map((r) => ({ ...r.txn, categoryName: r.categoryName, accountName: r.accountName }));
}

export async function getTransaction(id: string): Promise<TransactionListItem | undefined> {
  const rows = await db
    .select({ txn: transactions, categoryName: categories.name, accountName: accounts.name })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(eq(transactions.id, id))
    .limit(1);
  const r = rows[0];
  return r ? { ...r.txn, categoryName: r.categoryName, accountName: r.accountName } : undefined;
}

export async function countPendingOutbox(): Promise<number> {
  const rows = await db.select({ id: outboxMutations.clientMutationId }).from(outboxMutations);
  return rows.length;
}

export async function findPossibleDuplicate(
  accountId: string,
  amountCents: number,
  withinMinutes = 5,
): Promise<Transaction | undefined> {
  const cutoff = new Date(Date.now() - withinMinutes * 60_000).toISOString();
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.amountCents, amountCents),
        isNull(transactions.deletedAt),
      ),
    )
    .orderBy(desc(transactions.createdAt))
    .limit(5);
  return rows.find((row) => row.createdAt >= cutoff);
}
