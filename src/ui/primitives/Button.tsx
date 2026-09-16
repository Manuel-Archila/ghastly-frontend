import { type PressableProps, type PressableStateCallbackType, type ViewStyle } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";
import { AnimatedPressable, usePressScale } from "@/ui/usePressScale";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends PressableProps {
  label: string;
  variant?: Variant;
  fullWidth?: boolean;
}

/** Área táctil mínima 48×48 siempre, aunque el contenido sea más chico
 * (PLAN-frontend §4.4/§8) — se garantiza con `minHeight`, no a discreción
 * de cada pantalla. */
export function Button({
  label,
  variant = "primary",
  fullWidth = true,
  style,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const { colors, spacing, radii, minTouchTarget } = useTokens();
  const { scale, onPressIn: animateIn, onPressOut: animateOut } = usePressScale();

  const backgrounds: Record<Variant, string> = {
    primary: colors.accent.bg,
    secondary: colors.bg.sunken,
    ghost: "transparent",
    danger: colors.danger.bg,
  };
  const textColors: Record<Variant, string> = {
    primary: colors.accent.fg,
    secondary: colors.text.primary,
    ghost: colors.text.primary,
    danger: colors.danger.fg,
  };

  const baseStyle: ViewStyle = {
    minHeight: minTouchTarget,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[5],
    backgroundColor: backgrounds[variant],
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPressIn={(e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) => {
        animateIn();
        onPressIn?.(e);
      }}
      onPressOut={(e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) => {
        animateOut();
        onPressOut?.(e);
      }}
      style={(state: PressableStateCallbackType) => [
        baseStyle,
        { transform: [{ scale }] },
        typeof style === "function" ? style(state) : style,
        state.pressed && { opacity: 0.85 },
      ]}
      {...props}
    >
      <Text variant="bodyStrong" style={{ color: textColors[variant] }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
