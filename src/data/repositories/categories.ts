import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/data/db/client";
import { budgetItems, categories, outboxMutations, transactions } from "@/data/db/schema";
import { uuidv7 } from "@/lib/uuid";

export type Category = typeof categories.$inferSelect;

export async function createCategoryLocally(input: {
  name: string;
  kind: "expense" | "income";
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
  isTaxDeductible?: boolean;
}): Promise<string> {
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.insert(categories).values({
      id,
      name: input.name,
      kind: input.kind,
      parentId: input.parentId ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      isTaxDeductible: input.isTaxDeductible ?? false,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "category",
      entityId: id,
      op: "upsert",
      payload: {
        id,
        name: input.name,
        kind: input.kind,
        parent_id: input.parentId ?? null,
        icon: input.icon ?? null,
        color: input.color ?? null,
        is_tax_deductible: input.isTaxDeductible ?? false,
      },
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
  return id;
}

export async function listCategories(kind?: "expense" | "income"): Promise<Category[]> {
  const conditions = [isNull(categories.deletedAt), eq(categories.isArchived, false)];
  if (kind) {
    conditions.push(eq(categories.kind, kind));
  }
  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(categories.sortOrder, categories.name);
}

/**
 * Las categorías de un tipo más usadas, por frecuencia REAL de uso
 * (`use_count` local), para los chips de la captura rápida — tras dos
 * semanas el 80% de los movimientos entran con un tap en estas
 * (PLAN-frontend §6.1). La primera queda preseleccionada.
 */
export async function listMostUsedCategories(
  kind: "expense" | "income",
  limit = 6,
): Promise<Category[]> {
  const usage = await db
    .select({
      categoryId: transactions.categoryId,
      uses: sql<number>`count(*)`.as("uses"),
    })
    .from(transactions)
    .where(and(eq(transactions.kind, kind), isNull(transactions.deletedAt)))
    .groupBy(transactions.categoryId)
    .orderBy(desc(sql`uses`))
    .limit(limit);

  const rankedIds = usage.map((row) => row.categoryId).filter((id): id is string => id !== null);
  const ofKind = await listCategories(kind);

  const byId = new Map(ofKind.map((c) => [c.id, c]));
  const ranked = rankedIds.map((id) => byId.get(id)).filter((c): c is Category => c !== undefined);
  const rest = ofKind.filter((c) => !rankedIds.includes(c.id));
  return [...ranked, ...rest].slice(0, limit);
}

export async function getCategory(id: string): Promise<Category | undefined> {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
    .limit(1);
  return rows[0];
}

/** Todas las no borradas, con o sin archivadas (para la pantalla de categorías). */
export async function listCategoriesForManagement(includeArchived: boolean): Promise<Category[]> {
  const conditions = [isNull(categories.deletedAt)];
  if (!includeArchived) conditions.push(eq(categories.isArchived, false));
  return db
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(categories.sortOrder, categories.name);
}

/** Por sync solo viajan estos campos; el PADRE es online (`data/api/categories.ts`). */
export interface CategoryEdit {
  name?: string;
  icon?: string | null;
  color?: string | null;
  isTaxDeductible?: boolean;
  sortOrder?: number;
}

export async function updateCategoryLocally(id: string, edit: CategoryEdit): Promise<void> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {};
  if (edit.name !== undefined) payload.name = edit.name;
  if (edit.icon !== undefined) payload.icon = edit.icon;
  if (edit.color !== undefined) payload.color = edit.color;
  if (edit.isTaxDeductible !== undefined) payload.is_tax_deductible = edit.isTaxDeductible;
  if (edit.sortOrder !== undefined) payload.sort_order = edit.sortOrder;
  await db.transaction(async (tx) => {
    await tx
      .update(categories)
      .set({ ...edit, updatedAt: now })
      .where(eq(categories.id, id));
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "category",
      entityId: id,
      op: "upsert",
      payload,
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
}

/** Archiva (el servidor archiva ante `delete`) y quita la categoría de los
 * presupuestos, igual que él; los gastos ya registrados no se tocan. */
export async function archiveCategoryLocally(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.update(categories).set({ isArchived: true, updatedAt: now }).where(eq(categories.id, id));
    await tx
      .update(budgetItems)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(budgetItems.categoryId, id), isNull(budgetItems.deletedAt)));
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "category",
      entityId: id,
      op: "delete",
      payload: {},
      clientUpdatedAt: now,
      createdAt: now,
    });
  });
}

/** Refleja local un cambio de padre ya confirmado por el servidor (REST). */
export async function setCategoryParentLocally(id: string, parentId: string | null): Promise<void> {
  await db
    .update(categories)
    .set({ parentId, updatedAt: new Date().toISOString() })
    .where(eq(categories.id, id));
}

/** Reordena por `sort_order` vía outbox: un upsert por categoría que cambió. */
export async function reorderCategoriesLocally(orderedIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.update(categories).set({ sortOrder: index, updatedAt: now }).where(eq(categories.id, id));
      await tx.insert(outboxMutations).values({
        clientMutationId: uuidv7(),
        entityType: "category",
        entityId: id,
        op: "upsert",
        payload: { sort_order: index },
        clientUpdatedAt: now,
        createdAt: now,
      });
    }
  });
}
