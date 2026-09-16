import type { PressableProps, PressableStateCallbackType } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";
import { AnimatedPressable, usePressScale } from "@/ui/usePressScale";

export interface ChipProps extends PressableProps {
  label: string;
  selected?: boolean;
}

export function Chip({ label, selected = false, style, onPressIn, onPressOut, ...props }: ChipProps) {
  const { colors, spacing, radii, minTouchTarget } = useTokens();
  const { scale, onPressIn: animateIn, onPressOut: animateOut } = usePressScale();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPressIn={(e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) => {
        animateIn();
        onPressIn?.(e);
      }}
      onPressOut={(e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) => {
        animateOut();
        onPressOut?.(e);
      }}
      style={(state: PressableStateCallbackType) => [
        {
          minHeight: minTouchTarget,
          justifyContent: "center",
          paddingHorizontal: spacing[3],
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: selected ? colors.accent.bg : colors.border.subtle,
          backgroundColor: selected ? colors.accent.bg : colors.bg.surface,
          opacity: state.pressed ? 0.85 : 1,
          transform: [{ scale }],
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <Text variant="body" style={{ color: selected ? colors.accent.fg : colors.text.primary }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
