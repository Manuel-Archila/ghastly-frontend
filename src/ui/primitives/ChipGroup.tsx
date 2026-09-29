import type { PropsWithChildren } from "react";
import { View } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface ChipGroupProps {
  label?: string;
}

/** Etiqueta + fila de `Chip` que envuelve. Reemplaza el bloque que cada
 * formulario armaba a mano (cuenta, tipo, moneda, categoría…). */
export function ChipGroup({ label, children }: PropsWithChildren<ChipGroupProps>) {
  const { spacing } = useTokens();
  return (
    <View accessibilityRole="radiogroup" style={{ gap: spacing[2] }}>
      {label ? (
        <Text variant="caption" color="secondary">
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>{children}</View>
    </View>
  );
}
