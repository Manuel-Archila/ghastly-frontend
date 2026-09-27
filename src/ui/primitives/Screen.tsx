import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTokens } from "@/ui/tokens";

/** Fondo base + padding lateral de pantalla, en un solo lugar — ninguna
 * pantalla decide su propio `backgroundColor` o margen (CLAUDE.md).
 *
 * También evita en un solo lugar que el teclado tape un campo enfocado —
 * en iOS un `ScrollView` no hace scroll automático al input activo sin
 * esto; Android lo resuelve solo vía `windowSoftInputMode`, por eso el
 * `behavior` va condicionado a la plataforma. */
export function Screen({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { colors, spacing } = useTokens();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[{ flex: 1, paddingHorizontal: spacing[4] }, style]} {...props}>
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
