import { eq } from "drizzle-orm";

import { api } from "@/data/api/client";
import { db } from "@/data/db/client";
import { accounts, categories, syncState, transactions } from "@/data/db/schema";

interface SyncChange {
  entity_type: string;
  entity_id: string;
  op: "upsert" | "delete";
  payload: Record<string, unknown>;
  server_seq: number;
}

interface SyncPullResponse {
  changes: SyncChange[];
  next_seq: number;
  has_more: boolean;
}

const SYNC_STATE_KEY = "default";

async function getCursor(): Promise<number> {
  const rows = await db.select().from(syncState).where(eq(syncState.key, SYNC_STATE_KEY)).limit(1);
  return rows[0]?.lastPulledServerSeq ?? 0;
}

async function setCursor(seq: number): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(syncState)
    .values({ key: SYNC_STATE_KEY, lastPulledServerSeq: seq, lastSyncedAt: now })
    .onConflictDoUpdate({
      target: syncState.key,
      set: { lastPulledServerSeq: seq, lastSyncedAt: now },
    });
}

async function applyAccount(p: Record<string, unknown>): Promise<void> {
  await db
    .insert(accounts)
    .values({
      id: p.id as string,
      name: p.name as string,
      type: p.type as string,
      currency: p.currency as string,
      institution: (p.institution as string | null) ?? null,
      lastFour: (p.last_four as string | null) ?? null,
      initialBalanceCents: p.initial_balance_cents as number,
      currentBalanceCents: p.current_balance_cents as number,
      isArchived: p.is_archived as boolean,
      color: (p.color as string | null) ?? null,
      icon: (p.icon as string | null) ?? null,
      sortOrder: p.sort_order as number,
      creditLimitCents: (p.credit_limit_cents as number | null) ?? null,
      statementDay: (p.statement_day as number | null) ?? null,
      paymentDueDay: (p.payment_due_day as number | null) ?? null,
      interestRate: (p.interest_rate as number | null) ?? null,
      createdAt: p.created_at as string,
      updatedAt: p.updated_at as string,
    })
    .onConflictDoUpdate({
      target: accounts.id,
      set: {
        name: p.name as string,
        institution: (p.institution as string | null) ?? null,
        // El saldo es derivado: gana el servidor (PLAN-frontend §3).
        currentBalanceCents: p.current_balance_cents as number,
        isArchived: p.is_archived as boolean,
        updatedAt: p.updated_at as string,
      },
    });
}

async function applyCategory(p: Record<string, unknown>): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(categories)
    .values({
      id: p.id as string,
      name: p.name as string,
      kind: p.kind as string,
      parentId: (p.parent_id as string | null) ?? null,
      icon: (p.icon as string | null) ?? null,
      color: (p.color as string | null) ?? null,
      isArchived: (p.is_archived as boolean | undefined) ?? false,
      isTaxDeductible: (p.is_tax_deductible as boolean | undefined) ?? false,
      sortOrder: (p.sort_order as number | undefined) ?? 0,
      createdAt: (p.created_at as string | undefined) ?? now,
      updatedAt: (p.updated_at as string | undefined) ?? now,
    })
    .onConflictDoUpdate({
      target: categories.id,
      set: {
        name: p.name as string,
        isArchived: (p.is_archived as boolean | undefined) ?? false,
      },
    });
}

async function applyTransaction(p: Record<string, unknown>, op: "upsert" | "delete"): Promise<void> {
  if (op === "delete") {
    await db
      .update(transactions)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(transactions.id, p.id as string));
    return;
  }
  await db
    .insert(transactions)
    .values({
      id: p.id as string,
      accountId: p.account_id as string,
      categoryId: (p.category_id as string | null) ?? null,
      kind: p.kind as string,
      amountCents: p.amount_cents as number,
      currency: p.currency as string,
      fxRate: (p.fx_rate as number | null) ?? null,
      baseAmountCents: (p.base_amount_cents as number | null) ?? null,
      date: p.date as string,
      description: (p.description as string | null) ?? null,
      merchant: (p.merchant as string | null) ?? null,
      notes: (p.notes as string | null) ?? null,
      transferGroupId: (p.transfer_group_id as string | null) ?? null,
      transferDirection: (p.transfer_direction as string | null) ?? null,
      tags: (p.tags as string[] | undefined) ?? [],
      createdAt: p.created_at as string,
      updatedAt: p.updated_at as string,
    })
    .onConflictDoUpdate({
      target: transactions.id,
      set: {
        categoryId: (p.category_id as string | null) ?? null,
        description: (p.description as string | null) ?? null,
        updatedAt: p.updated_at as string,
        deletedAt: null,
      },
    });
}

async function softDelete(entityType: string, id: string): Promise<void> {
  const now = new Date().toISOString();
  if (entityType === "account") {
    await db.update(accounts).set({ deletedAt: now }).where(eq(accounts.id, id));
  } else if (entityType === "category") {
    await db.update(categories).set({ deletedAt: now }).where(eq(categories.id, id));
  }
}

/** Trae y aplica todos los cambios del servidor desde el último cursor. */
export async function pullChanges(): Promise<number> {
  let cursor = await getCursor();
  let applied = 0;

  for (;;) {
    const page = await api.get<SyncPullResponse>(`/sync/pull?since=${cursor}&limit=500`);
    for (const change of page.changes) {
      if (change.op === "delete" && change.entity_type !== "transaction") {
        await softDelete(change.entity_type, change.entity_id);
      } else if (change.entity_type === "account") {
        await applyAccount(change.payload);
      } else if (change.entity_type === "category") {
        await applyCategory(change.payload);
      } else if (change.entity_type === "transaction") {
        await applyTransaction(change.payload, change.op);
      }
      applied += 1;
    }
    cursor = page.next_seq;
    await setCursor(cursor);
    if (!page.has_more) break;
  }

  return applied;
}
