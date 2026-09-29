import { Pressable, View } from "react-native";

import { Icon } from "@/ui/primitives/Icon";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface MonthSwitcherProps {
  /** Mes ya legible ("septiembre 2026"), nunca ISO. */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevLabel?: string;
  nextLabel?: string;
}

/** ‹ mes › con áreas táctiles de 48 pt. Lo usan calendario y reportes. */
export function MonthSwitcher({
  label,
  onPrev,
  onNext,
  prevLabel = "Mes anterior",
  nextLabel = "Mes siguiente",
}: MonthSwitcherProps) {
  const { minTouchTarget, opacity, spacing } = useTokens();
  const arrow = (name: "chevron-back" | "chevron-forward", onPress: () => void, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      hitSlop={spacing[1]}
      style={({ pressed }) => ({
        width: minTouchTarget,
        height: minTouchTarget,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? opacity.pressedSubtle : 1,
      })}
    >
      <Icon name={name} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      {arrow("chevron-back", onPrev, prevLabel)}
      <Text variant="bodyStrong" accessibilityRole="header" style={{ textTransform: "capitalize" }}>
        {label}
      </Text>
      {arrow("chevron-forward", onNext, nextLabel)}
    </View>
  );
}
