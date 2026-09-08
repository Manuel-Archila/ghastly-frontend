import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/data/db/client";
import { budgetItems, budgets, categories, outboxMutations, transactions } from "@/data/db/schema";
import { computeItemProgress, projectPeriodEnd, suggestedDailyPace } from "@/domain/budget";
import { uuidv7 } from "@/lib/uuid";

export type Budget = typeof budgets.$inferSelect;

export async function createBudgetLocally(input: {
  name: string;
  items: { categoryId: string; amountCents: number }[];
}): Promise<string> {
  const budgetId = uuidv7();
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx.insert(budgets).values({ id: budgetId, name: input.name, createdAt: now, updatedAt: now });
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "budget",
      entityId: budgetId,
      op: "upsert",
      payload: { id: budgetId, name: input.name },
      clientUpdatedAt: now,
      createdAt: now,
    });

    for (const item of input.items) {
      const itemId = uuidv7();
      await tx.insert(budgetItems).values({
        id: itemId,
        budgetId,
        categoryId: item.categoryId,
        amountCents: item.amountCents,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(outboxMutations).values({
        clientMutationId: uuidv7(),
        entityType: "budget_item",
        entityId: itemId,
        op: "upsert",
        payload: {
          id: itemId,
          budget_id: budgetId,
          category_id: item.categoryId,
          amount_cents: item.amountCents,
        },
        clientUpdatedAt: now,
        createdAt: now,
      });
    }
  });

  return budgetId;
}

export interface CategoryProgress {
  categoryId: string;
  categoryName: string;
  budgetedCents: number;
  spentCents: number;
  availableCents: number;
  percentConsumed: number;
  projectedCents: number;
  suggestedDailyPaceCents: number;
}

export interface BudgetCurrent {
  month: string;
  totalBudgetedCents: number;
  totalSpentCents: number;
  totalAvailableCents: number;
  globalProjectedCents: number;
  items: CategoryProgress[];
  unbudgeted: { categoryId: string; categoryName: string; spentCents: number }[];
}

function monthBounds(month: string): { start: string; end: string; days: number } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(last).padStart(2, "0")}`,
    days: last,
  };
}

function daysElapsed(month: string, days: number): number {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  if (currentMonth < month) return 0;
  if (currentMonth > month) return days;
  return Number(today.slice(8, 10));
}

export type BudgetItem = typeof budgetItems.$inferSelect;

export async function listBudgetItems(budgetId: string): Promise<BudgetItem[]> {
  return db
    .select()
    .from(budgetItems)
    .where(and(eq(budgetItems.budgetId, budgetId), isNull(budgetItems.deletedAt)))
    .orderBy(budgetItems.sortOrder);
}

/** Agrega o cambia el monto de una categoría en el presupuesto activo. */
export async function upsertBudgetItemLocally(
  budgetId: string,
  categoryId: string,
  amountCents: number,
  existingItemId?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    if (existingItemId) {
      await tx
        .update(budgetItems)
        .set({ amountCents, updatedAt: now })
        .where(eq(budgetItems.id, existingItemId));
      await tx.insert(outboxMutations).values({
        clientMutationId: uuidv7(),
        entityType: "budget_item",
        entityId: existingItemId,
        op: "upsert",
        payload: { budget_id: budgetId, amount_cents: amountCents },
        clientUpdatedAt: now,
        createdAt: now,
      });
      return;
    }
    const id = uuidv7();
    await tx
      .insert(budgetItems)
      .values({ id, budgetId, categoryId, amountCents, createdAt: now, updatedAt: now });
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "budget_item",
      entityId: id,
      op: "upsert",
      payload: { id, budget_id: budgetId, category_id: categoryId, amount_cents: amountCents },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
}

export async function setBudgetRolloverLocally(
  budgetId: string,
  rolloverEnabled: boolean,
): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(budgets)
      .set({ rolloverEnabled, updatedAt: now })
      .where(eq(budgets.id, budgetId));
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "budget",
      entityId: budgetId,
      op: "upsert",
      payload: { rollover_enabled: rolloverEnabled },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
}

export async function getActiveBudget(): Promise<Budget | undefined> {
  const rows = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.isActive, true), isNull(budgets.deletedAt)))
    .limit(1);
  return rows[0];
}

async function spentByCategory(start: string, end: string): Promise<Map<string, number>> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      // Gastos suman; reembolsos (income con refund_of_id) restan de su
      // categoría original — caso 5. Las transferencias nunca entran (regla 1).
      total: sql<number>`sum(case when ${transactions.refundOfId} is not null
        then -${transactions.amountCents} else ${transactions.amountCents} end)`.as("total"),
    })
    .from(transactions)
    .where(
      and(
        sql`(${transactions.kind} = 'expense' or ${transactions.refundOfId} is not null)`,
        isNull(transactions.deletedAt),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    )
    .groupBy(transactions.categoryId);

  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.categoryId) map.set(row.categoryId, row.total);
  }
  return map;
}

/**
 * Calcula el consumo del mes LOCALMENTE (PLAN-frontend §6: la pantalla
 * siempre lee de SQLite; el endpoint solo alimenta la caché). El rollover
 * congelado de meses cerrados aún no se cachea local — se asume 0 hasta
 * que la pantalla de historial lo traiga.
 */
export async function computeBudgetCurrent(month: string): Promise<BudgetCurrent | null> {
  const budget = await getActiveBudget();
  if (!budget) return null;

  const { start, end, days } = monthBounds(month);
  const elapsed = daysElapsed(month, days);
  const remaining = Math.max(0, days - elapsed);

  const items = await db
    .select({ item: budgetItems, categoryName: categories.name })
    .from(budgetItems)
    .leftJoin(categories, eq(categories.id, budgetItems.categoryId))
    .where(and(eq(budgetItems.budgetId, budget.id), isNull(budgetItems.deletedAt)))
    .orderBy(budgetItems.sortOrder);

  const spent = await spentByCategory(start, end);
  const budgetedCategoryIds = new Set(items.map((i) => i.item.categoryId));

  const progress: CategoryProgress[] = items.map(({ item, categoryName }) => {
    const spentCents = spent.get(item.categoryId) ?? 0;
    const p = computeItemProgress({ budgetedCents: item.amountCents, spentCents });
    return {
      categoryId: item.categoryId,
      categoryName: categoryName ?? "",
      budgetedCents: p.budgetedCents,
      spentCents: p.spentCents,
      availableCents: p.availableCents,
      percentConsumed: p.percentConsumed,
      projectedCents: projectPeriodEnd(spentCents, elapsed, days),
      suggestedDailyPaceCents: suggestedDailyPace(p.availableCents, remaining),
    };
  });

  const totalSpentCents = [...spent.values()].reduce((a, b) => a + b, 0);
  const totalBudgetedCents = items.reduce((a, i) => a + i.item.amountCents, 0);

  const unbudgetedIds = [...spent.keys()].filter(
    (id) => !budgetedCategoryIds.has(id) && (spent.get(id) ?? 0) > 0,
  );
  const unbudgetedNames =
    unbudgetedIds.length > 0
      ? await db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(inArray(categories.id, unbudgetedIds))
      : [];
  const nameById = new Map(unbudgetedNames.map((c) => [c.id, c.name]));
  const unbudgeted = unbudgetedIds.map((categoryId) => ({
    categoryId,
    categoryName: nameById.get(categoryId) ?? "",
    spentCents: spent.get(categoryId) ?? 0,
  }));

  return {
    month,
    totalBudgetedCents,
    totalSpentCents,
    totalAvailableCents: totalBudgetedCents - totalSpentCents,
    globalProjectedCents: projectPeriodEnd(totalSpentCents, elapsed, days),
    items: progress,
    unbudgeted,
  };
}
