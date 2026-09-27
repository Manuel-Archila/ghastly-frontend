import type { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

/** Íconos que se ofrecen al crear/editar una categoría. */
export const CATEGORY_ICON_PRESETS: IconName[] = [
  "restaurant-outline",
  "cart-outline",
  "car-outline",
  "home-outline",
  "medkit-outline",
  "school-outline",
  "game-controller-outline",
  "airplane-outline",
  "gift-outline",
  "cash-outline",
  "shirt-outline",
  "paw-outline",
];

export function asIconName(value: string | null): IconName | null {
  return value && (CATEGORY_ICON_PRESETS as string[]).includes(value) ? (value as IconName) : null;
}
