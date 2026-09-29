import { useColorScheme } from "react-native";

import { darkColors, lightColors, type ColorTokens } from "./colors";
import { dot, iconSize, opacity, stroke } from "./misc";
import * as motion from "./motion";
import { radii, spacing, minTouchTarget } from "./spacing";
import { typography } from "./typography";

export { spacing, radii, minTouchTarget, typography, motion, opacity, iconSize, dot, stroke };
export type { ColorTokens };

export interface Tokens {
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  minTouchTarget: typeof minTouchTarget;
  opacity: typeof opacity;
  iconSize: typeof iconSize;
  dot: typeof dot;
  stroke: typeof stroke;
}

/**
 * Sigue el tema del sistema. El override manual (Ajustes → Apariencia,
 * PLAN-frontend §6.12) es Fase 5: cuando exista, esta función es el único
 * lugar que cambia — lee la preferencia guardada antes que `useColorScheme`.
 */
export function useTokens(): Tokens {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;
  return { colors, spacing, radii, typography, minTouchTarget, opacity, iconSize, dot, stroke };
}
