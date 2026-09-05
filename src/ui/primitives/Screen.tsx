import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTokens } from "@/ui/tokens";

/** Fondo base + padding lateral de pantalla, en un solo lugar — ninguna
 * pantalla decide su propio `backgroundColor` o margen (CLAUDE.md). */
export function Screen({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { colors, spacing } = useTokens();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <View style={[{ flex: 1, paddingHorizontal: spacing[4] }, style]} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}
