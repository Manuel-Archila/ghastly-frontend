import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated } from "react-native";

import { useTokens } from "@/ui/tokens";

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}

/**
 * Placeholder con la forma del contenido — nunca un spinner centrado
 * (CLAUDE.md). El pulso respeta "Reducir movimiento": si está activo en el
 * sistema, queda estático en vez de animar.
 */
export function Skeleton({ width = "100%", height = 16, radius }: SkeletonProps) {
  const { colors, radii } = useTokens();
  const [opacity] = useState(() => new Animated.Value(0.5));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduceMotion(enabled);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius ?? radii.sm,
        backgroundColor: colors.bg.sunken,
        opacity: reduceMotion ? 0.7 : opacity,
      }}
    />
  );
}
