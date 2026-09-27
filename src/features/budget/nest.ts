/**
 * Anida ítems de presupuesto: cada raíz seguida de sus hijos (máx. 2
 * niveles). `parentCategoryId` ya viene filtrado por `effectiveParents`
 * (solo si el padre también está presupuestado), así que un hijo huérfano
 * nunca aparece: es raíz.
 */
export function nestByParent<T extends { categoryId: string; parentCategoryId: string | null }>(
  items: T[],
): { item: T; depth: 0 | 1 }[] {
  const childrenOf = new Map<string, T[]>();
  const roots: T[] = [];
  for (const item of items) {
    if (item.parentCategoryId) {
      const list = childrenOf.get(item.parentCategoryId) ?? [];
      list.push(item);
      childrenOf.set(item.parentCategoryId, list);
    } else {
      roots.push(item);
    }
  }
  const rows: { item: T; depth: 0 | 1 }[] = [];
  for (const root of roots) {
    rows.push({ item: root, depth: 0 });
    for (const child of childrenOf.get(root.categoryId) ?? []) rows.push({ item: child, depth: 1 });
  }
  return rows;
}
