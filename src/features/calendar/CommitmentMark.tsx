import { View, type ViewStyle } from "react-native";

import type { CommitmentEvent } from "@/features/calendar/upcoming";
import { useTokens } from "@/ui/tokens";

export type CommitmentKind = CommitmentEvent["kind"];

/** Nombre legible de cada tipo: va en la leyenda y en la etiqueta accesible. */
export const COMMITMENT_LABEL: Record<CommitmentKind, string> = {
  recurring: "Suscripción",
  installment: "Cuota",
  card_statement: "Corte de tarjeta",
  card_payment: "Pago de tarjeta",
};

/**
 * Marca de un compromiso en la grilla. Cada tipo se distingue por FORMA y no
 * solo por color (CLAUDE.md, "nunca solo color"): círculo, cuadrado, rombo
 * y anillo se separan a este tamaño sin depender del matiz.
 */
export function CommitmentMark({ kind }: { kind: CommitmentKind }) {
  const { colors, dot, stroke } = useTokens();
  const side = dot.sm;
  const color =
    kind === "recurring"
      ? colors.transfer.fg
      : kind === "installment"
        ? colors.accent.bg
        : kind === "card_statement"
          ? colors.warning.fg
          : colors.expense.fg;

  const base: ViewStyle = { width: side, height: side };
  let style: ViewStyle;
  switch (kind) {
    case "recurring": // círculo
      style = { ...base, borderRadius: side / 2, backgroundColor: color };
      break;
    case "installment": // cuadrado
      style = { ...base, borderRadius: stroke.hairline, backgroundColor: color };
      break;
    case "card_statement": // rombo
      style = {
        ...base,
        borderRadius: stroke.hairline,
        backgroundColor: color,
        transform: [{ rotate: "45deg" }],
      };
      break;
    case "card_payment": // anillo
      style = {
        ...base,
        borderRadius: side / 2,
        borderWidth: stroke.control,
        borderColor: color,
      };
      break;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    />
  );
}
