import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/data/db/client";
import { accounts, outboxMutations } from "@/data/db/schema";
import { uuidv7 } from "@/lib/uuid";

export type Account = typeof accounts.$inferSelect;

export interface CreateAccountInput {
  name: string;
  type: string;
  initialBalanceCents: number;
  currency?: string;
}

/** Escribe local + encola en el outbox, en una transacción de DB. */
export async function createAccountLocally(input: CreateAccountInput): Promise<string> {
  const id = uuidv7();
  const now = new Date().toISOString();
  const currency = input.currency ?? "GTQ";

  await db.transaction(async (tx) => {
    await tx.insert(accounts).values({
      id,
      name: input.name,
      type: input.type,
      currency,
      initialBalanceCents: input.initialBalanceCents,
      currentBalanceCents: input.initialBalanceCents,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "account",
      entityId: id,
      op: "upsert",
      payload: {
        id,
        name: input.name,
        type: input.type,
        currency,
        initial_balance_cents: input.initialBalanceCents,
      },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });

  return id;
}

/** La UI SIEMPRE lee de acá, nunca hace `fetch` (CLAUDE.md). */
export async function listAccounts(): Promise<Account[]> {
  return db
    .select()
    .from(accounts)
    .where(and(isNull(accounts.deletedAt), eq(accounts.isArchived, false)))
    .orderBy(accounts.sortOrder);
}

export async function getAccount(id: string): Promise<Account | undefined> {
  const rows = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return rows[0];
}

/** El servidor ya archivó la cuenta (ver `data/api/accounts.ts::deleteAccount`)
 * — esto solo refleja eso local para que la UI no espere al próximo pull. */
export async function markAccountArchivedLocally(id: string): Promise<void> {
  await db
    .update(accounts)
    .set({ isArchived: true, updatedAt: new Date().toISOString() })
    .where(eq(accounts.id, id));
}
