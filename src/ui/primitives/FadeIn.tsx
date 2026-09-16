import { type PropsWithChildren, useEffect, useState } from "react";
import { AccessibilityInfo, Animated } from "react-native";

export interface FadeInProps {
  /** Retraso opcional en ms — para escalonar filas de una lista sin animar
   * todo el bloque de una sola vez. */
  delay?: number;
}

/** Fade + slide sutil al montar (8px), para que listas y tarjetas no
 * aparezcan de golpe. Respeta "Reducir movimiento" (mismo criterio que
 * `Skeleton.tsx`): si está activo, se muestra directo, sin animar — sin
 * esperar esa respuesta async para el primer render (evita un parpadeo). */
export function FadeIn({ children, delay = 0 }: PropsWithChildren<FadeInProps>) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(8));

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (cancelled) return;
      if (enabled) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, delay, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, delay, useNativeDriver: true }),
      ]).start();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
  );
}
