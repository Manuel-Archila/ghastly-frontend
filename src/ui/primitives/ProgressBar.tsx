import { View } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";

import { useTokens } from "@/ui/tokens";
import { bezier, duration } from "@/ui/tokens/motion";
import { useReducedMotion } from "@/ui/useReducedMotion";

export interface ProgressBarProps {
  /** 0-100. Se recorta visualmente a 100 aunque el valor real sea mayor
   * (sobregiro) — el número real se muestra aparte, la barra no explota. */
  percent: number;
  /** Color de la barra llena; por default usa el semáforo ingreso/ámbar/rojo
   * de PLAN-frontend §4.2 según `percent`. */
  color?: string;
  height?: number;
}

const clamp = (percent: number) => Math.min(100, Math.max(0, percent));
const EASE = cubicBezier(...bezier.out);
const FILL_ON_MOUNT = {
  animationName: { from: { width: "0%" } },
  animationDuration: duration.count,
  animationTimingFunction: EASE,
} as const;

/** Única barra de progreso de la app. El relleno crece desde 0 al montar y
 * sigue los cambios de `percent`; el color del semáforo se funde al cruzar
 * 80 % / 100 %. Es una transición CSS de Reanimated (hilo de UI): el relleno es
 * un elemento absoluto sin hijos, el único caso donde animar `width` no
 * relayoutea a nadie más. "Reducir movimiento": salta directo al valor. */
export function ProgressBar({ percent, color, height = 6 }: ProgressBarProps) {
  const { colors, radii } = useTokens();
  const reduceMotion = useReducedMotion();
  const fillColor = color ?? semaphoreColor(percent, colors);
  return (
    <View
      style={{ height, backgroundColor: colors.bg.sunken, borderRadius: radii.sm }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(percent)) }}
    >
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${clamp(percent)}%`,
          backgroundColor: fillColor,
          borderRadius: radii.sm,
          // Llenado inicial: animación de montaje desde 0 (solo `from`, el
          // destino es el `width` real). Los cambios posteriores los cubre la
          // transición.
          ...(reduceMotion ? null : FILL_ON_MOUNT),
          transitionProperty: ["width", "backgroundColor"],
          transitionDuration: reduceMotion ? 0 : duration.count,
          transitionTimingFunction: EASE,
        }}
      />
    </View>
  );
}

export function semaphoreColor(percent: number, colors: ReturnType<typeof useTokens>["colors"]): string {
  if (percent > 100) return colors.danger.fg;
  if (percent >= 80) return colors.warning.fg;
  return colors.income.fg;
}
