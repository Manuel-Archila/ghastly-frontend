import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Pressable } from "react-native";

/** Único `Animated.createAnimatedComponent` de `Pressable` para toda la
 * app — evita crear un componente nuevo en cada render de cada primitiva. */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Feedback de presión compartido por `Button` y `Chip`: achica levemente
 * al presionar y vuelve con spring al soltar. Respeta "Reducir movimiento"
 * (mismo criterio que `Skeleton.tsx`) — si está activo, la escala se queda
 * fija en 1 y solo queda el cambio de opacidad que ya hacía cada primitiva.
 */
export function usePressScale() {
  const [scale] = useState(() => new Animated.Value(1));
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

  function onPressIn() {
    if (reduceMotion) return;
    Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }).start();
  }

  function onPressOut() {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  }

  return { scale, onPressIn, onPressOut };
}
