import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}

/** Título de las pantallas sin header nativo (las tabs). Un solo lugar para
 * el espacio superior: antes cada tab lo resolvía distinto. */
export function ScreenHeader({ title, subtitle, trailing }: ScreenHeaderProps) {
  const { spacing } = useTokens();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: spacing[3],
        paddingTop: spacing[4],
        paddingBottom: spacing[3],
      }}
    >
      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text variant="title1" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
