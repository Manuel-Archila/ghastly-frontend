import { Pressable, type PressableProps, type PressableStateCallbackType } from "react-native";

import Animated from "react-native-reanimated";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";
import { usePressScale } from "@/ui/usePressScale";

export interface ChipProps extends PressableProps {
  label: string;
  selected?: boolean;
}

/** `Pressable` normal, no `Animated.createAnimatedComponent(Pressable)` —
 * ver la nota en `Button.tsx`: rompe el `style` como función de `state`
 * que necesitamos para pintar `selected`/`pressed`. La escala animada va
 * en un `Animated.View` interno. */
export function Chip({ label, selected = false, style, onPressIn, onPressOut, ...props }: ChipProps) {
  const { colors, spacing, radii, minTouchTarget, opacity, stroke } = useTokens();
  const { pressStyle, onPressIn: animateIn, onPressOut: animateOut } = usePressScale();

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPressIn={(e) => {
        animateIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateOut();
        onPressOut?.(e);
      }}
      style={(state: PressableStateCallbackType) => [
        {
          minHeight: minTouchTarget,
          justifyContent: "center",
          paddingHorizontal: spacing[3],
          borderRadius: radii.sm,
          borderWidth: stroke.control,
          borderColor: selected ? colors.accent.bg : colors.border.control,
          backgroundColor: selected ? colors.accent.bg : colors.bg.surface,
          opacity: state.pressed ? opacity.pressed : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Animated.View style={pressStyle}>
        <Text variant="body" style={{ color: selected ? colors.accent.fg : colors.text.primary }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
