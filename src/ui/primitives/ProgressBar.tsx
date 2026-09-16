import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";

import { useTokens } from "@/ui/tokens";

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

/** Única barra de progreso de la app (antes vivía inline en cada pantalla
 * que la necesitaba, ver CLAUDE.md: cero literales de estilo repetidos). El
 * relleno anima al cambiar `percent`, respetando "Reducir movimiento" (si
 * está activo, salta directo al valor final, sin transición). */
export function ProgressBar({ percent, color, height = 6 }: ProgressBarProps) {
  const { colors, radii } = useTokens();
  const fillColor = color ?? semaphoreColor(percent, colors);
  const [width] = useState(() => new Animated.Value(0));
  const didMount = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion || !didMount.current) {
        width.setValue(clamp(percent));
        didMount.current = true;
        return;
      }
      Animated.timing(width, {
        toValue: clamp(percent),
        duration: 400,
        useNativeDriver: false,
      }).start();
    });
  }, [percent, width]);

  return (
    <View
      style={{ height, backgroundColor: colors.bg.sunken, borderRadius: radii.sm }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
    >
      <Animated.View
        style={{
          height,
          width: width.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
          backgroundColor: fillColor,
          borderRadius: radii.sm,
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
