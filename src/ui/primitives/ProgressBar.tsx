import { View } from "react-native";

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

/** Única barra de progreso de la app (antes vivía inline en cada pantalla
 * que la necesitaba, ver CLAUDE.md: cero literales de estilo repetidos). */
export function ProgressBar({ percent, color, height = 6 }: ProgressBarProps) {
  const { colors, radii } = useTokens();
  const fillColor = color ?? semaphoreColor(percent, colors);

  return (
    <View
      style={{ height, backgroundColor: colors.bg.sunken, borderRadius: radii.sm }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
    >
      <View
        style={{
          height,
          width: `${Math.min(100, Math.max(0, percent))}%`,
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
