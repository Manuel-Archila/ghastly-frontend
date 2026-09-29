import { useState } from "react";
import { cubicBezier, type CSSTransitionProperties } from "react-native-reanimated";

import { bezier, duration, pressScale } from "@/ui/tokens/motion";
import { useReducedMotion } from "@/ui/useReducedMotion";

const TRANSITION: CSSTransitionProperties = {
  transitionProperty: "transform",
  transitionDuration: duration.press,
  transitionTimingFunction: cubicBezier(...bezier.out),
};

/**
 * Feedback de presión compartido por `Button` y `Chip`: achica a 0.97 al
 * presionar y vuelve al soltar. Es una transición CSS de Reanimated (corre en
 * el hilo de UI, se puede interrumpir a mitad sin saltos) — no hay valores
 * compartidos ni un frame de JS de por medio.
 *
 * Se aplica al `Animated.View` INTERNO, nunca al `Pressable`: envolver
 * `Pressable` con un componente animado rompe su `style` como función de
 * `state` (ya pasó una vez).
 *
 * "Reducir movimiento": la escala se queda en 1 y solo queda el cambio de
 * opacidad que ya hace cada primitiva.
 */
export function usePressScale() {
  const reduceMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);

  return {
    pressStyle: {
      ...TRANSITION,
      transform: [{ scale: pressed && !reduceMotion ? pressScale : 1 }],
    },
    onPressIn: () => setPressed(true),
    onPressOut: () => setPressed(false),
  };
}
