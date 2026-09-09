import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";

import { useTokens } from "@/ui/tokens";

/** Superficie elevada estándar — una de las tres elevaciones de la app
 * (plano, tarjeta, sheet; PLAN-frontend §4.4). Nada de sombras decorativas. */
export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { colors, spacing, radii } = useTokens();
  return (
    <View
      style={[
        {
          backgroundColor: colors.bg.surface,
          borderRadius: radii.md,
          padding: spacing[4],
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
