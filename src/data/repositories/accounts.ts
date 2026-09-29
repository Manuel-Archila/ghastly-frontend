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
  /** Solo tiene sentido para `type: "credit_card"` — el backend los acepta
   * desde la creación (AccountCreate), no hace falta esperar a editar. */
  creditLimitCents?: number | null;
  statementDay?: number | null;
  paymentDueDay?: number | null;
  interestRate?: number | null;
  minimumPaymentPercent?: number | null;
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
      creditLimitCents: input.creditLimitCents ?? null,
      statementDay: input.statementDay ?? null,
      paymentDueDay: input.paymentDueDay ?? null,
      interestRate: input.interestRate ?? null,
      minimumPaymentPercent: input.minimumPaymentPercent ?? null,
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
        credit_limit_cents: input.creditLimitCents ?? null,
        statement_day: input.statementDay ?? null,
        payment_due_day: input.paymentDueDay ?? null,
        interest_rate: input.interestRate ?? null,
        minimum_payment_percent: input.minimumPaymentPercent ?? null,
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

export interface AccountEdit {
  name?: string;
  institution?: string | null;
  lastFour?: string | null;
  color?: string | null;
  icon?: string | null;
  creditLimitCents?: number | null;
  statementDay?: number | null;
  paymentDueDay?: number | null;
  interestRate?: number | null;
  minimumPaymentPercent?: number | null;
}

/** Escribe local + encola en el outbox, igual que `updateCategoryLocally`.
 * Mismos campos que `ACCOUNT_EDITABLE_FIELDS` en el backend — el saldo y el
 * tipo de cuenta NO se editan acá (derivado / fijo al crear). */
export async function updateAccountLocally(id: string, edit: AccountEdit): Promise<void> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {};
  if (edit.name !== undefined) payload.name = edit.name;
  if (edit.institution !== undefined) payload.institution = edit.institution;
  if (edit.lastFour !== undefined) payload.last_four = edit.lastFour;
  if (edit.color !== undefined) payload.color = edit.color;
  if (edit.icon !== undefined) payload.icon = edit.icon;
  if (edit.creditLimitCents !== undefined) payload.credit_limit_cents = edit.creditLimitCents;
  if (edit.statementDay !== undefined) payload.statement_day = edit.statementDay;
  if (edit.paymentDueDay !== undefined) payload.payment_due_day = edit.paymentDueDay;
  if (edit.interestRate !== undefined) payload.interest_rate = edit.interestRate;
  if (edit.minimumPaymentPercent !== undefined) {
    payload.minimum_payment_percent = edit.minimumPaymentPercent;
  }

  await db.transaction(async (tx) => {
    await tx.update(accounts).set({ ...edit, updatedAt: now }).where(eq(accounts.id, id));
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "account",
      entityId: id,
      op: "upsert",
      payload,
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
}
