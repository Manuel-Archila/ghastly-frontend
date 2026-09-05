import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/data/db/client";
import { accounts, outboxMutations, transactions } from "@/data/db/schema";
import { signedDelta, type AccountType } from "@/domain/balances";
import { uuidv7 } from "@/lib/uuid";

export type Transaction = typeof transactions.$inferSelect;

export interface CreateTransactionInput {
  accountId: string;
  categoryId: string | null;
  kind: "expense" | "income";
  amountCents: number;
  date: string; // YYYY-MM-DD
  description?: string | null;
}

/**
 * Escribe el gasto en SQLite y encola la mutación en el outbox, todo en
 * una transacción de DB. La UI se actualiza al instante (0 ms); el sync
 * worker empuja después (PLAN-frontend §3). El saldo se actualiza local
 * con `domain/balances` para pintar rápido — el servidor lo sobrescribe
 * al llegar el pull.
 */
export async function createTransactionLocally(input: CreateTransactionInput): Promise<string> {
  const id = uuidv7();
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      id,
      accountId: input.accountId,
      categoryId: input.categoryId,
      kind: input.kind,
      amountCents: input.amountCents,
      currency: "GTQ",
      date: input.date,
      description: input.description ?? null,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });

    const accountRows = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, input.accountId))
      .limit(1);
    const account = accountRows[0];
    if (account) {
      const delta = signedDelta(
        { kind: input.kind, amountCents: input.amountCents },
        account.type as AccountType,
      );
      await tx
        .update(accounts)
        .set({ currentBalanceCents: account.currentBalanceCents + delta, updatedAt: now })
        .where(eq(accounts.id, input.accountId));
    }

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
        currency: "GTQ",
        date: input.date,
        description: input.description ?? null,
      },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });

  return id;
}

export async function listRecentTransactions(limit = 50): Promise<Transaction[]> {
  return db
    .select()
    .from(transactions)
    .where(isNull(transactions.deletedAt))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);
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
