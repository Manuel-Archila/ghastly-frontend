import type { PropsWithChildren } from "react";
import { ScrollView } from "react-native";

import { Screen } from "@/ui/primitives/Screen";
import { useTokens } from "@/ui/tokens";

export interface ScrollScreenProps {
  /** Separación entre bloques (escala de espaciado). 4 para formularios y
   * detalles; 5-6 cuando hay secciones que deben respirar. */
  gap?: 3 | 4 | 5 | 6;
}

/**
 * Pantalla con scroll y el padding estándar (arriba 16, abajo 32, gutter lateral
 * del `Screen`). Reemplaza los `ScrollView` con `contentContainerStyle` propio
 * que cada pantalla escribía distinto. Cierra el teclado al tocar fuera de un
 * campo sin perder el foco de los botones.
 */
export function ScrollScreen({ gap = 4, children }: PropsWithChildren<ScrollScreenProps>) {
  const { spacing } = useTokens();
  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: spacing[gap],
          paddingTop: spacing[4],
          paddingBottom: spacing[8],
        }}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}
