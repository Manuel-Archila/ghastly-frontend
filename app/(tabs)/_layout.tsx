import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { useTokens } from "@/ui/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? active : inactive} color={color as string} size={size} />;
  }
  return TabIcon;
}

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
      <Tabs.Screen
        name="index"
        options={{ title: "Hoy", tabBarIcon: tabIcon("home", "home-outline") }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ title: "Movimientos", tabBarIcon: tabIcon("list", "list-outline") }}
      />
      <Tabs.Screen
        name="budget"
        options={{ title: "Presupuesto", tabBarIcon: tabIcon("pie-chart", "pie-chart-outline") }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Más",
          tabBarIcon: tabIcon("ellipsis-horizontal-circle", "ellipsis-horizontal-circle-outline"),
        }}
      />
    </Tabs>
  );
}
