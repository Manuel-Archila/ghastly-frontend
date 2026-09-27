/**
 * Árbol de categorías (máximo 2 niveles). Funciones puras: validan en el
 * cliente lo mismo que el servidor, para no ir a la red a fallar.
 */

export interface CategoryNode {
  id: string;
  parentId: string | null;
  kind: string;
}

export type ParentError = "CATEGORY_TOO_DEEP" | "CATEGORY_KIND_MISMATCH" | "CATEGORY_SELF_PARENT";

/**
 * ¿Se puede poner `newParentId` como padre de `categoryId`?
 * - máximo 2 niveles: el padre tiene que ser raíz;
 * - una categoría con subcategorías no puede volverse subcategoría;
 * - padre e hija son del mismo tipo (gasto/ingreso).
 */
export function validateParent(
  categoryId: string,
  newParentId: string | null,
  categories: CategoryNode[],
): ParentError | null {
  if (newParentId === null) return null;
  if (newParentId === categoryId) return "CATEGORY_SELF_PARENT";
  const byId = new Map(categories.map((c) => [c.id, c]));
  const parent = byId.get(newParentId);
  const self = byId.get(categoryId);
  if (!parent || !self) return null;
  if (parent.parentId !== null) return "CATEGORY_TOO_DEEP";
  if (categories.some((c) => c.parentId === categoryId)) return "CATEGORY_TOO_DEEP";
  if (parent.kind !== self.kind) return "CATEGORY_KIND_MISMATCH";
  return null;
}

export interface TreeRow<T> {
  category: T;
  depth: 0 | 1;
}

/** Aplana el árbol: cada raíz seguida de sus hijas. Un hijo cuyo padre no
 * está en la lista (p. ej. archivado) se muestra como raíz. */
export function flattenTree<T extends { id: string; parentId: string | null }>(
  categories: T[],
): TreeRow<T>[] {
  const ids = new Set(categories.map((c) => c.id));
  const childrenOf = new Map<string, T[]>();
  const roots: T[] = [];
  for (const c of categories) {
    if (c.parentId && ids.has(c.parentId)) {
      const list = childrenOf.get(c.parentId) ?? [];
      list.push(c);
      childrenOf.set(c.parentId, list);
    } else {
      roots.push(c);
    }
  }
  const rows: TreeRow<T>[] = [];
  for (const root of roots) {
    rows.push({ category: root, depth: 0 });
    for (const child of childrenOf.get(root.id) ?? []) rows.push({ category: child, depth: 1 });
  }
  return rows;
}
