import type { ColorTokens } from "@/ui/tokens";

/**
 * Color estable por categoría (skill `dataviz`: "color follows the entity,
 * never its rank"). Hash determinístico del id → uno de los 6 slots fijos
 * de `colors.categorical` — así "Alimentación" es el mismo color siempre,
 * sin importar en qué posición cae ese mes, y sin guardar ninguna
 * asignación en ningún lado.
 */
export function categoryColorFor(categoryId: string, colors: ColorTokens): string {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % colors.categorical.length;
  return colors.categorical[index];
}
