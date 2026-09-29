import { Pressable, type PressableProps, type PressableStateCallbackType, type ViewStyle } from "react-native";

import Animated from "react-native-reanimated";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";
import { usePressScale } from "@/ui/usePressScale";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends PressableProps {
  label: string;
  variant?: Variant;
  fullWidth?: boolean;
}

/** Área táctil mínima 48×48 siempre, aunque el contenido sea más chico
 * (PLAN-frontend §4.4/§8) — se garantiza con `minHeight`, no a discreción
 * de cada pantalla.
 *
 * OJO: `Pressable` (no `Animated.createAnimatedComponent(Pressable)`) —
 * `Animated.createAnimatedComponent` no soporta el `style` como función
 * de `state` que usa Pressable para pintar `pressed`; envolverlo rompía
 * TODO el estilo condicional (fondo, texto, disabled). La escala animada
 * va en un `Animated.View` interno, no en el propio Pressable. */
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
  const { colors, spacing, radii, minTouchTarget, opacity } = useTokens();
  const { pressStyle, onPressIn: animateIn, onPressOut: animateOut } = usePressScale();

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

  // Deshabilitado: tono apagado con texto legible, no un 50 % de opacidad
  // que dejaba el botón primario en ~2:1 de contraste.
  const background = disabled && variant !== "ghost" ? colors.bg.sunken : backgrounds[variant];
  const textColor = disabled ? colors.text.tertiary : textColors[variant];

  const baseStyle: ViewStyle = {
    minHeight: minTouchTarget,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[5],
    backgroundColor: background,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  };

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPressIn={(e) => {
        animateIn();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateOut();
        onPressOut?.(e);
      }}
      style={(state: PressableStateCallbackType) => [
        baseStyle,
        typeof style === "function" ? style(state) : style,
        state.pressed && { opacity: opacity.pressed },
      ]}
    >
      <Animated.View style={pressStyle}>
        <Text variant="bodyStrong" style={{ color: textColor }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
