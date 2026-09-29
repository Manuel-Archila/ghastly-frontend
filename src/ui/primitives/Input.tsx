import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, onFocus, onBlur, ...props }: InputProps) {
  const { colors, spacing, radii, typography, minTouchTarget, stroke } = useTokens();
  const [focused, setFocused] = useState(false);

  // Foco visible: el borde toma el acento y engorda. El error manda sobre el foco.
  const borderColor = error
    ? colors.danger.fg
    : focused
      ? colors.accent.bg
      : colors.border.control;

  return (
    <View style={{ gap: spacing[1] }}>
      {label ? (
        <Text variant="caption" color="secondary">
          {label}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.text.tertiary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          typography.body,
          {
            minHeight: minTouchTarget,
            borderRadius: radii.sm,
            borderWidth: focused || error ? stroke.control : stroke.hairline,
            borderColor,
            paddingHorizontal: spacing[3],
            color: colors.text.primary,
            backgroundColor: colors.bg.surface,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="caption" accessibilityRole="alert" style={{ color: colors.danger.fg }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
