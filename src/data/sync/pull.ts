import { eq } from "drizzle-orm";

import { api } from "@/data/api/client";
import { db } from "@/data/db/client";
import {
  accounts,
  budgetItems,
  budgets,
  categories,
  debts,
  goals,
  installmentPlans,
  installments,
  recurringRules,
  syncState,
  transactions,
} from "@/data/db/schema";

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
        // Padre/orden pueden cambiar por REST o desde otro dispositivo.
        parentId: (p.parent_id as string | null) ?? null,
        icon: (p.icon as string | null) ?? null,
        color: (p.color as string | null) ?? null,
        sortOrder: (p.sort_order as number | undefined) ?? 0,
        isTaxDeductible: (p.is_tax_deductible as boolean | undefined) ?? false,
        isArchived: (p.is_archived as boolean | undefined) ?? false,
        updatedAt: (p.updated_at as string | undefined) ?? now,
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

async function applyBudget(p: Record<string, unknown>): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(budgets)
    .values({
      id: p.id as string,
      name: p.name as string,
      periodType: (p.period_type as string | undefined) ?? "monthly",
      isActive: (p.is_active as boolean | undefined) ?? true,
      rolloverEnabled: (p.rollover_enabled as boolean | undefined) ?? false,
      globalLimitCents: (p.global_limit_cents as number | null) ?? null,
      incomeBasis: (p.income_basis as string | undefined) ?? "fixed",
      fixedIncomeCents: (p.fixed_income_cents as number | null) ?? null,
      createdAt: (p.created_at as string | undefined) ?? now,
      updatedAt: (p.updated_at as string | undefined) ?? now,
    })
    .onConflictDoUpdate({
      target: budgets.id,
      set: {
        name: p.name as string,
        isActive: (p.is_active as boolean | undefined) ?? true,
        rolloverEnabled: (p.rollover_enabled as boolean | undefined) ?? false,
        globalLimitCents: (p.global_limit_cents as number | null) ?? null,
        incomeBasis: (p.income_basis as string | undefined) ?? "fixed",
        fixedIncomeCents: (p.fixed_income_cents as number | null) ?? null,
      },
    });
}

async function applyBudgetItem(p: Record<string, unknown>): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(budgetItems)
    .values({
      id: p.id as string,
      budgetId: p.budget_id as string,
      categoryId: p.category_id as string,
      amountCents: p.amount_cents as number,
      rolloverEnabled: (p.rollover_enabled as boolean | null) ?? null,
      sortOrder: (p.sort_order as number | undefined) ?? 0,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: budgetItems.id,
      set: {
        // La categoría del ítem ahora es editable en el servidor.
        categoryId: p.category_id as string,
        amountCents: p.amount_cents as number,
        rolloverEnabled: (p.rollover_enabled as boolean | null) ?? null,
        sortOrder: (p.sort_order as number | undefined) ?? 0,
        updatedAt: now, // el payload del servidor no trae created_at/updated_at
      },
    });
}

/**
 * Los "compromisos" (recurrentes, cuotas, deudas, metas) se crean online
 * vía sus endpoints REST; el pull solo los baja para que las pantallas
 * lean local. Se guarda el payload crudo del servidor tal cual — es lo que
 * la pantalla necesita — mapeando snake_case a las columnas.
 */
async function applyRecurringRule(p: Record<string, unknown>): Promise<void> {
  const v = {
    id: p.id as string,
    accountId: p.account_id as string,
    categoryId: (p.category_id as string | null) ?? null,
    kind: p.kind as string,
    name: p.name as string,
    amountCents: p.amount_cents as number,
    currency: p.currency as string,
    frequency: p.frequency as string,
    interval: p.interval as number,
    nextDueDate: p.next_due_date as string,
    endDate: (p.end_date as string | null) ?? null,
    autoCreate: p.auto_create as boolean,
    reminderDaysBefore: p.reminder_days_before as number,
    status: p.status as string,
    lastGeneratedAt: (p.last_generated_at as string | null) ?? null,
    lastAmountCents: (p.last_amount_cents as number | null) ?? null,
    isExtraordinary: (p.is_extraordinary as boolean | undefined) ?? false,
    createdAt: p.created_at as string,
    updatedAt: p.updated_at as string,
  };
  await db
    .insert(recurringRules)
    .values(v)
    .onConflictDoUpdate({ target: recurringRules.id, set: v });
}

async function applyInstallmentPlan(p: Record<string, unknown>): Promise<void> {
  const v = {
    id: p.id as string,
    accountId: p.account_id as string,
    categoryId: (p.category_id as string | null) ?? null,
    description: p.description as string,
    merchant: (p.merchant as string | null) ?? null,
    totalAmountCents: p.total_amount_cents as number,
    installmentsCount: p.installments_count as number,
    firstPaymentDate: p.first_payment_date as string,
    monthlyInterestRate: Number(p.monthly_interest_rate ?? 0),
    status: p.status as string,
    createdAt: p.created_at as string,
    updatedAt: p.updated_at as string,
  };
  await db
    .insert(installmentPlans)
    .values(v)
    .onConflictDoUpdate({ target: installmentPlans.id, set: v });
}

async function applyInstallment(p: Record<string, unknown>): Promise<void> {
  const v = {
    id: p.id as string,
    planId: p.plan_id as string,
    number: p.number as number,
    dueDate: p.due_date as string,
    amountCents: p.amount_cents as number,
    principalCents: p.principal_cents as number,
    interestCents: p.interest_cents as number,
    paidAt: (p.paid_at as string | null) ?? null,
    transactionId: (p.transaction_id as string | null) ?? null,
    status: p.status as string,
  };
  await db.insert(installments).values(v).onConflictDoUpdate({ target: installments.id, set: v });
}

async function applyDebt(p: Record<string, unknown>): Promise<void> {
  const v = {
    id: p.id as string,
    name: p.name as string,
    type: p.type as string,
    principalCents: p.principal_cents as number,
    balanceCents: p.balance_cents as number,
    monthlyInterestRate: Number(p.monthly_interest_rate ?? 0),
    monthlyPaymentCents: (p.monthly_payment_cents as number | null) ?? null,
    startDate: p.start_date as string,
    termMonths: (p.term_months as number | null) ?? null,
    linkedAccountId: (p.linked_account_id as string | null) ?? null,
    status: p.status as string,
    createdAt: p.created_at as string,
    updatedAt: p.updated_at as string,
  };
  await db.insert(debts).values(v).onConflictDoUpdate({ target: debts.id, set: v });
}

async function applyGoal(p: Record<string, unknown>): Promise<void> {
  const v = {
    id: p.id as string,
    name: p.name as string,
    targetAmountCents: p.target_amount_cents as number,
    currentAmountCents: p.current_amount_cents as number,
    targetDate: (p.target_date as string | null) ?? null,
    linkedAccountId: (p.linked_account_id as string | null) ?? null,
    icon: (p.icon as string | null) ?? null,
    status: p.status as string,
    createdAt: p.created_at as string,
    updatedAt: p.updated_at as string,
  };
  await db.insert(goals).values(v).onConflictDoUpdate({ target: goals.id, set: v });
}

export async function softDelete(entityType: string, id: string): Promise<void> {
  const now = new Date().toISOString();
  if (entityType === "account") {
    await db.update(accounts).set({ deletedAt: now }).where(eq(accounts.id, id));
  } else if (entityType === "category") {
    await db.update(categories).set({ deletedAt: now }).where(eq(categories.id, id));
  } else if (entityType === "budget") {
    await db.update(budgets).set({ deletedAt: now }).where(eq(budgets.id, id));
  } else if (entityType === "budget_item") {
    await db.update(budgetItems).set({ deletedAt: now }).where(eq(budgetItems.id, id));
  } else if (entityType === "recurring_rule") {
    await db.update(recurringRules).set({ deletedAt: now }).where(eq(recurringRules.id, id));
  } else if (entityType === "installment_plan") {
    await db.update(installmentPlans).set({ deletedAt: now }).where(eq(installmentPlans.id, id));
  } else if (entityType === "debt") {
    await db.update(debts).set({ deletedAt: now }).where(eq(debts.id, id));
  } else if (entityType === "goal") {
    await db.update(goals).set({ deletedAt: now }).where(eq(goals.id, id));
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
      } else if (change.entity_type === "budget") {
        await applyBudget(change.payload);
      } else if (change.entity_type === "budget_item") {
        await applyBudgetItem(change.payload);
      } else if (change.entity_type === "recurring_rule") {
        await applyRecurringRule(change.payload);
      } else if (change.entity_type === "installment_plan") {
        await applyInstallmentPlan(change.payload);
      } else if (change.entity_type === "installment") {
        await applyInstallment(change.payload);
      } else if (change.entity_type === "debt") {
        await applyDebt(change.payload);
      } else if (change.entity_type === "goal") {
        await applyGoal(change.payload);
      }
      // budget_period / debt_payment / goal_contribution: se traen cuando
      // haya pantalla de historial que los use.
      applied += 1;
    }
    cursor = page.next_seq;
    await setCursor(cursor);
    if (!page.has_more) break;
  }

  return applied;
}
