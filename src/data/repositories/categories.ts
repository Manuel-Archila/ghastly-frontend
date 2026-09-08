import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/data/db/client";
import { categories, outboxMutations, transactions } from "@/data/db/schema";
import { uuidv7 } from "@/lib/uuid";

export type Category = typeof categories.$inferSelect;

export async function createCategoryLocally(input: {
  name: string;
  kind: "expense" | "income";
  parentId?: string | null;
}): Promise<string> {
  const id = uuidv7();
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.insert(categories).values({
      id,
      name: input.name,
      kind: input.kind,
      parentId: input.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(outboxMutations).values({
      clientMutationId: uuidv7(),
      entityType: "category",
      entityId: id,
      op: "upsert",
      payload: { id, name: input.name, kind: input.kind, parent_id: input.parentId ?? null },
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
 * Las 6 categorías de gasto más usadas, por frecuencia REAL de uso
 * (`use_count` local), para los chips de la captura rápida — tras dos
 * semanas el 80% de los gastos entran con un tap en estas (PLAN-frontend §6.1).
 */
export async function listMostUsedExpenseCategories(limit = 6): Promise<Category[]> {
  const usage = await db
    .select({
      categoryId: transactions.categoryId,
      uses: sql<number>`count(*)`.as("uses"),
    })
    .from(transactions)
    .where(and(eq(transactions.kind, "expense"), isNull(transactions.deletedAt)))
    .groupBy(transactions.categoryId)
    .orderBy(desc(sql`uses`))
    .limit(limit);

  const rankedIds = usage.map((row) => row.categoryId).filter((id): id is string => id !== null);
  const expenseCategories = await listCategories("expense");

  const byId = new Map(expenseCategories.map((c) => [c.id, c]));
  const ranked = rankedIds.map((id) => byId.get(id)).filter((c): c is Category => c !== undefined);
  const rest = expenseCategories.filter((c) => !rankedIds.includes(c.id));
  return [...ranked, ...rest].slice(0, limit);
}
