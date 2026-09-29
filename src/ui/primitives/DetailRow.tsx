import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface DetailRowProps {
  label: string;
  /** Texto simple, o un nodo (`MoneyText`, `Chip`…) cuando hace falta. */
  value: ReactNode;
}

/** Par etiqueta/valor de las pantallas de detalle. La etiqueta cede espacio
 * y el valor se alinea a la derecha; ambos envuelven con fuentes grandes. */
export function DetailRow({ label, value }: DetailRowProps) {
  const { spacing } = useTokens();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing[3] }}>
      <Text variant="body" color="secondary" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text variant="body" style={{ flexShrink: 1, textAlign: "right" }}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}
