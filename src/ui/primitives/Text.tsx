import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { useTokens } from "@/ui/tokens";
import type { typography } from "@/ui/tokens/typography";

type Variant = keyof typeof typography;
type ColorRole = "primary" | "secondary" | "tertiary" | "inverse";

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: ColorRole;
}

/**
 * Única forma de poner texto en la app. Nunca `<RNText style={{ fontSize: 16 }}>`
 * suelto en una pantalla — el tamaño, peso y color salen de `ui/tokens`
 * (CLAUDE.md: "un #FF3B30 suelto es un bug").
 */
export function Text({ variant = "body", color = "primary", style, ...props }: TextProps) {
  const tokens = useTokens();
  return (
    <RNText
      style={[tokens.typography[variant], { color: tokens.colors.text[color] }, style]}
      {...props}
    />
  );
}
