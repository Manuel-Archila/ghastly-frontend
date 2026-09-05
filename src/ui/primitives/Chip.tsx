import { Pressable, type PressableProps } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface ChipProps extends PressableProps {
  label: string;
  selected?: boolean;
}

export function Chip({ label, selected = false, style, ...props }: ChipProps) {
  const { colors, spacing, radii, minTouchTarget } = useTokens();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={(state) => [
        {
          minHeight: minTouchTarget,
          justifyContent: "center",
          paddingHorizontal: spacing[3],
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: selected ? colors.accent.bg : colors.border.subtle,
          backgroundColor: selected ? colors.accent.bg : colors.bg.surface,
          opacity: state.pressed ? 0.85 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      <Text
        variant="body"
        style={{ color: selected ? colors.accent.fg : colors.text.primary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
