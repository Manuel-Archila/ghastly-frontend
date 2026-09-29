import { View } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface HeroFigureProps {
  label: string;
  /** Cifra ya formateada (`Money.format()`): es LA cifra grande de la pantalla. */
  value: string;
  subtitle?: string;
  tone?: "neutral" | "income" | "expense";
}

/** Una sola cifra grande por pantalla (CLAUDE.md): todo lo demás la sostiene. */
export function HeroFigure({ label, value, subtitle, tone = "neutral" }: HeroFigureProps) {
  const { colors, spacing } = useTokens();
  const color =
    tone === "income" ? colors.income.fg : tone === "expense" ? colors.expense.fg : colors.text.primary;
  return (
    <View
      accessible
      accessibilityLabel={subtitle ? `${label}, ${value}, ${subtitle}` : `${label}, ${value}`}
      style={{ gap: spacing[1] }}
    >
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text variant="display" adjustsFontSizeToFit numberOfLines={1} style={{ color }}>
        {value}
      </Text>
      {subtitle ? (
        <Text variant="caption" color="secondary">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
