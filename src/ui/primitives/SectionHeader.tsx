import { View } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface SectionHeaderProps {
  label: string;
  /** Dato a la derecha (un total, un conteo). */
  trailing?: string;
}

/** Encabezado de sección. El texto se escribe normal: las mayúsculas las
 * pone el token `overline`. */
export function SectionHeader({ label, trailing }: SectionHeaderProps) {
  const { spacing } = useTokens();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: spacing[2],
        paddingTop: spacing[2],
      }}
    >
      <Text variant="overline" color="secondary" accessibilityRole="header">
        {label}
      </Text>
      {trailing ? (
        <Text variant="caption" color="secondary">
          {trailing}
        </Text>
      ) : null}
    </View>
  );
}
