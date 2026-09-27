import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/data/db/client";
import { budgetItems, budgets, categories, outboxMutations, transactions } from "@/data/db/schema";
import {
  computeItemProgress,
  effectiveParents,
  projectPeriodEnd,
  rollupSpent,
  suggestedDailyPace,
  summarizeHierarchy,
} from "@/domain/budget";
import { uuidv7 } from "@/lib/uuid";

export type Budget = typeof budgets.$inferSelect;

/** Códigos idénticos a los del servidor: la UI decide por `code`, no por texto. */
export type BudgetRuleCode =
  | "BUDGET_ITEM_CATEGORY_TAKEN"
  | "BUDGET_REQUIRES_EXPENSE_CATEGORY"
  | "CATEGORY_NOT_FOUND";

export class BudgetRuleError extends Error {
  readonly code: BudgetRuleCode;
  constructor(code: BudgetRuleCode) {
    super(code);
    this.name = "BudgetRuleError";
    this.code = code;
  }
}

/** Valida en local lo que el servidor rechazaría con 409: categoría de
 * gasto existente y sin ítem activo repetido en el presupuesto. */
async function assertItemCategoryAllowed(
  budgetId: string,
  categoryId: string,
  exceptItemId?: string,
): Promise<void> {
  const cat = (
    await db
      .select({ kind: categories.kind })
      .from(categories)
      .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
      .limit(1)
  )[0];
  if (!cat) throw new BudgetRuleError("CATEGORY_NOT_FOUND");
  if (cat.kind !== "expense") throw new BudgetRuleError("BUDGET_REQUIRES_EXPENSE_CATEGORY");

  const dupes = await db
    .select({ id: budgetItems.id })
    .from(budgetItems)
    .where(
      and(
        eq(budgetItems.budgetId, budgetId),
        eq(budgetItems.categoryId, categoryId),
        isNull(budgetItems.deletedAt),
      ),
    );
  if (dupes.some((d) => d.id !== exceptItemId)) {
    throw new BudgetRuleError("BUDGET_ITEM_CATEGORY_TAKEN");
  }
}

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
  /** Solo si el padre también está presupuestado; si no, es raíz. */
  parentCategoryId: string | null;
  childrenBudgetedCents: number;
  childrenExcessCents: number;
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
  // Fuera de la transacción: lee con el `db` global, no con `tx`.
  if (!existingItemId) await assertItemCategoryAllowed(budgetId, categoryId);
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

/** Quita una categoría del presupuesto. Los gastos ya registrados no se
 * tocan: pasan a "sin presupuesto". Borrado lógico + `delete` al outbox. */
export async function removeBudgetItemLocally(itemId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(budgetItems)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(budgetItems.id, itemId));
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "budget_item",
      entityId: itemId,
      op: "delete",
      payload: {},
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
}

/** Cambia la categoría de un ítem (ahora es editable en el servidor). */
export async function changeBudgetItemCategoryLocally(
  itemId: string,
  budgetId: string,
  categoryId: string,
): Promise<void> {
  await assertItemCategoryAllowed(budgetId, categoryId, itemId);
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx
      .update(budgetItems)
      .set({ categoryId, updatedAt: now })
      .where(eq(budgetItems.id, itemId));
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "budget_item",
      entityId: itemId,
      op: "upsert",
      payload: { budget_id: budgetId, category_id: categoryId },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
}

export interface HierarchyWarning {
  parentItemId: string;
  parentCategoryId: string;
  parentCents: number;
  childrenCents: number;
  excessCents: number;
}

/** Estructura derivada de los ítems activos + `categories.parentId`. */
async function loadHierarchy(budgetId: string) {
  const rows = await db
    .select({ item: budgetItems, parentId: categories.parentId })
    .from(budgetItems)
    .leftJoin(categories, eq(categories.id, budgetItems.categoryId))
    .where(and(eq(budgetItems.budgetId, budgetId), isNull(budgetItems.deletedAt)));

  const parentOf = effectiveParents(new Map(rows.map((r) => [r.item.categoryId, r.parentId ?? null])));
  const budgeted = new Map(rows.map((r) => [r.item.categoryId, r.item.amountCents]));
  const itemIdByCategory = new Map(rows.map((r) => [r.item.categoryId, r.item.id]));
  return { parentOf, budgeted, itemIdByCategory, summary: summarizeHierarchy(budgeted, parentOf) };
}

/** Advertencia (nunca bloqueo) cuando los hijos suman más que su padre.
 * `data.warning` solo existe en REST, no en `/sync/push`: se calcula local. */
export async function getBudgetHierarchyWarnings(budgetId: string): Promise<HierarchyWarning[]> {
  const { budgeted, itemIdByCategory, summary } = await loadHierarchy(budgetId);
  const warnings: HierarchyWarning[] = [];
  for (const [parentCategoryId, excessCents] of summary.childrenExcess) {
    warnings.push({
      parentItemId: itemIdByCategory.get(parentCategoryId) ?? "",
      parentCategoryId,
      parentCents: budgeted.get(parentCategoryId) ?? 0,
      childrenCents: summary.childrenBudgeted.get(parentCategoryId) ?? 0,
      excessCents,
    });
  }
  return warnings;
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
      // `base_amount_cents` (caso 4) es el equivalente en GTQ ya congelado
      // por el servidor — coalesce a `amount_cents` porque en GTQ vale lo
      // mismo (espejo de la misma expresión en budget_service.py del backend).
      total: sql<number>`sum(case when ${transactions.refundOfId} is not null
        then -coalesce(${transactions.baseAmountCents}, ${transactions.amountCents})
        else coalesce(${transactions.baseAmountCents}, ${transactions.amountCents}) end)`.as(
        "total",
      ),
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
    .select({ item: budgetItems, categoryName: categories.name, parentId: categories.parentId })
    .from(budgetItems)
    .leftJoin(categories, eq(categories.id, budgetItems.categoryId))
    .where(and(eq(budgetItems.budgetId, budget.id), isNull(budgetItems.deletedAt)))
    .orderBy(budgetItems.sortOrder);

  const spent = await spentByCategory(start, end);
  const budgetedCategoryIds = new Set(items.map((i) => i.item.categoryId));

  // Jerarquía derivada de `categories.parentId` (máx. 2 niveles). Cada
  // transacción tiene UNA categoría, así que no hay doble conteo.
  const allCats = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories)
    .where(isNull(categories.deletedAt));
  const parentById = new Map(allCats.map((c) => [c.id, c.parentId]));
  const childrenOf = new Map<string, string[]>();
  for (const c of allCats) {
    if (!c.parentId) continue;
    const list = childrenOf.get(c.parentId) ?? [];
    list.push(c.id);
    childrenOf.set(c.parentId, list);
  }

  const parentOf = effectiveParents(new Map(items.map((i) => [i.item.categoryId, i.parentId ?? null])));
  const hierarchy = summarizeHierarchy(
    new Map(items.map((i) => [i.item.categoryId, i.item.amountCents])),
    parentOf,
  );

  const progress: CategoryProgress[] = items.map(({ item, categoryName }) => {
    const spentCents = rollupSpent(item.categoryId, childrenOf.get(item.categoryId) ?? [], spent);
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
      parentCategoryId: parentOf.get(item.categoryId) ?? null,
      childrenBudgetedCents: hierarchy.childrenBudgeted.get(item.categoryId) ?? 0,
      childrenExcessCents: hierarchy.childrenExcess.get(item.categoryId) ?? 0,
    };
  });

  // El total sigue siendo TODO el gasto; lo presupuestado son solo las
  // raíces (los hijos son un reparto dentro del padre).
  const totalSpentCents = [...spent.values()].reduce((a, b) => a + b, 0);
  const totalBudgetedCents = hierarchy.rootTotalCents;

  // Sin presupuesto: lo que ya cuenta en el ítem de su padre no va aquí.
  const unbudgetedIds = [...spent.keys()].filter((id) => {
    if ((spent.get(id) ?? 0) <= 0 || budgetedCategoryIds.has(id)) return false;
    const parent = parentById.get(id);
    return !(parent && budgetedCategoryIds.has(parent));
  });
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
