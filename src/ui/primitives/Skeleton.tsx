import Animated from "react-native-reanimated";

import { useTokens } from "@/ui/tokens";
import { duration } from "@/ui/tokens/motion";
import { useReducedMotion } from "@/ui/useReducedMotion";

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}

const PULSE = {
  animationName: { from: { opacity: 0.5 }, to: { opacity: 1 } },
  animationDuration: duration.pulse,
  animationDirection: "alternate",
  animationIterationCount: "infinite",
  animationTimingFunction: "ease-in-out",
} as const;

/**
 * Placeholder con la forma del contenido — nunca un spinner centrado
 * (CLAUDE.md). El pulso es una animación CSS de Reanimated (hilo de UI). Con
 * "Reducir movimiento" queda estático en vez de animar.
 */
export function Skeleton({ width = "100%", height = 16, radius }: SkeletonProps) {
  const { colors, radii } = useTokens();
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? radii.sm,
          backgroundColor: colors.border.subtle,
        },
        reduceMotion ? { opacity: 0.75 } : PULSE,
      ]}
    />
  );
}
