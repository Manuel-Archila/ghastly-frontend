import { TextInput, View, type TextInputProps } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const { colors, spacing, radii, typography, minTouchTarget } = useTokens();
  return (
    <View style={{ gap: spacing[1] }}>
      {label ? (
        <Text variant="caption" color="secondary">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.text.tertiary}
        style={[
          typography.body,
          {
            minHeight: minTouchTarget,
            borderRadius: radii.sm,
            borderWidth: 1,
            borderColor: error ? colors.danger.fg : colors.border.subtle,
            paddingHorizontal: spacing[3],
            color: colors.text.primary,
            backgroundColor: colors.bg.surface,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="caption" style={{ color: colors.danger.fg }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
