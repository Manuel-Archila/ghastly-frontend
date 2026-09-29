import type { TextStyle } from "react-native";

/**
 * Fuente del sistema (SF Pro / Roboto vía `undefined` fontFamily).
 * Cifras siempre con `tabular-nums` — sin esto las columnas de montos
 * bailan al hacer scroll (PLAN-frontend §4.3).
 */
export type TypographyToken = Pick<
  TextStyle,
  "fontSize" | "fontWeight" | "fontVariant" | "lineHeight" | "letterSpacing" | "textTransform"
>;

const TABULAR: TextStyle["fontVariant"] = ["tabular-nums"];

export const typography: Record<
  "display" | "title1" | "title2" | "body" | "bodyStrong" | "caption" | "micro" | "overline",
  TypographyToken
> = {
  display: { fontSize: 40, fontWeight: "600", lineHeight: 48, fontVariant: TABULAR },
  title1: { fontSize: 28, fontWeight: "600", lineHeight: 34, fontVariant: TABULAR },
  title2: { fontSize: 20, fontWeight: "600", lineHeight: 26, fontVariant: TABULAR },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 22, fontVariant: TABULAR },
  bodyStrong: { fontSize: 16, fontWeight: "600", lineHeight: 22, fontVariant: TABULAR },
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18, fontVariant: TABULAR },
  micro: { fontSize: 11, fontWeight: "500", lineHeight: 14, fontVariant: TABULAR },
  /** Encabezado de sección: mayúsculas suaves (PLAN-frontend §4.3). El texto
   * se escribe normal; la transformación vive acá, no en cada string. */
  overline: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
};
