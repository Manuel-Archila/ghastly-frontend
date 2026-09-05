import { Tabs } from "expo-router";

import { useTokens } from "@/ui/tokens";

/**
 * 5 tabs, ni una más (PLAN-frontend §5) — Hoy, Movimientos, [FAB],
 * Presupuesto, Más. El FAB central (captura rápida) no es un tab real,
 * es una acción con `tabBarButton` propio: llega en Fase 1 junto con la
 * pantalla de captura rápida que abre. Por ahora, 4 tabs vacíos.
 */
export default function TabsLayout() {
  const { colors } = useTokens();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.bg,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.bg.surface,
          borderTopColor: colors.border.subtle,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Hoy" }} />
      <Tabs.Screen name="transactions" options={{ title: "Movimientos" }} />
      <Tabs.Screen name="budget" options={{ title: "Presupuesto" }} />
      <Tabs.Screen name="more" options={{ title: "Más" }} />
    </Tabs>
  );
}
