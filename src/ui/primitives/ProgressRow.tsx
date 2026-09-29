import { View } from "react-native";

import { Icon } from "@/ui/primitives/Icon";
import { ProgressBar, semaphoreColor } from "@/ui/primitives/ProgressBar";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface ProgressRowProps {
  label: string;
  /** 0-100+. La barra se recorta a 100; el texto muestra el valor real. */
  percent: number;
  /** Texto de la derecha ya formateado ("62 %", "Q 800 de Q 1,000"). */
  valueText: string;
  caption?: string;
  /** Color fijo para progreso donde llegar al 100 % es bueno (una meta de
   * ahorro): anula el semáforo y el ícono de alerta. */
  color?: string;
}

/**
 * Etiqueta + cifra + barra. Desde 80 % suma un ícono además del color (ámbar
 * o rojo): el estado nunca depende solo del color (CLAUDE.md).
 */
export function ProgressRow({ label, percent, valueText, caption, color: fixedColor }: ProgressRowProps) {
  const { colors, spacing, iconSize } = useTokens();
  const color = fixedColor ?? semaphoreColor(percent, colors);
  const alert = !fixedColor && percent >= 80;
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${valueText}${caption ? `, ${caption}` : ""}`}
      style={{ gap: spacing[1] }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing[2] }}>
        <Text variant="body" style={{ flexShrink: 1 }}>
          {label}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
          {alert ? <Icon name="alert-circle-outline" size={iconSize.sm} color={color} /> : null}
          <Text variant="bodyStrong" style={{ color }}>
            {valueText}
          </Text>
        </View>
      </View>
      <ProgressBar percent={percent} color={color} />
      {caption ? (
        <Text variant="caption" color="secondary">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
