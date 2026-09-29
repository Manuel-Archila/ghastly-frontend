import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { formatForKind, Money, type TransactionKind } from "@/domain/money";
import { useTokens } from "@/ui/tokens";
import type { typography } from "@/ui/tokens/typography";

export interface MoneyTextProps extends Omit<RNTextProps, "children"> {
  cents: number;
  currency?: string;
  /** Decide signo y color: gasto `−` rojo, ingreso `+` verde, transferencia
   * gris con flecha y sin signo. `neutral` es un saldo o total sin semántica. */
  kind?: TransactionKind | "neutral";
  variant?: keyof typeof typography;
}

/**
 * Única forma de pintar un monto (CLAUDE.md: el signo lo decide un solo
 * lugar). Junta formato de `domain/money.ts`, color semántico y cifras
 * tabulares. El color nunca es el único portador: el signo o la flecha
 * siempre van en el texto.
 */
export function MoneyText({
  cents,
  currency = "GTQ",
  kind = "neutral",
  variant = "bodyStrong",
  style,
  ...props
}: MoneyTextProps) {
  const { colors, typography } = useTokens();
  const money = new Money(cents, currency);
  const color =
    kind === "income"
      ? colors.income.fg
      : kind === "expense"
        ? colors.expense.fg
        : kind === "transfer"
          ? colors.transfer.fg
          : colors.text.primary;
  const text = kind === "neutral" ? money.format() : formatForKind(money, kind);
  return (
    <RNText style={[typography[variant], { color }, style]} {...props}>
      {text}
    </RNText>
  );
}
