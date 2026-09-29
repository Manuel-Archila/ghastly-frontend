import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs, useRouter } from "expo-router";
import { Pressable, type ColorValue } from "react-native";
import Animated from "react-native-reanimated";

import { useTokens } from "@/ui/tokens";
import { usePressScale } from "@/ui/usePressScale";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? active : inactive} color={color as string} size={size} />;
  }
  return TabIcon;
}

/** Botón central: no es un tab, abre la captura rápida (la métrica que manda:
 * registrar un gasto en < 10 s, siempre a un tap desde cualquier tab). */
function AddButton() {
  const router = useRouter();
  const { colors, spacing, minTouchTarget, radii, opacity } = useTokens();
  const { pressStyle, onPressIn, onPressOut } = usePressScale();
  // El círculo se ve del tamaño de un ícono de la barra; el área táctil es
  // todo el espacio del tab (mínimo 48×48).
  const size = minTouchTarget - spacing[2];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Registrar gasto"
      onPress={() => router.push("/(modals)/quick-add")}
      // Feedback al bajar el dedo, no al soltar: la captura es lo que más se
      // toca y tiene que sentirse inmediata. Un solo háptico ligero por toque.
      onPressIn={() => {
        onPressIn();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={onPressOut}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: minTouchTarget,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? opacity.pressed : 1,
      })}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radii.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent.bg,
          },
          pressStyle,
        ]}
      >
        <Ionicons name="add" size={size * 0.7} color={colors.accent.fg} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * 5 tabs, ni una más (PLAN-frontend §5) — Hoy, Movimientos, [FAB],
 * Presupuesto, Más. El FAB central no es un tab real: `tabBarButton`
 * propio que abre la captura rápida.
 */
export default function TabsLayout() {
  const { colors } = useTokens();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Las tabs son pares, no una jerarquía: cambiar entre ellas no se
        // desliza ni se funde (se hace decenas de veces al día).
        animation: "none",
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
        name="add"
        options={{ title: "Registrar", tabBarButton: () => <AddButton /> }}
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
