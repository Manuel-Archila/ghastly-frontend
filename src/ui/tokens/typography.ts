import type { TextStyle } from "react-native";

/**
 * Fuente del sistema (SF Pro / Roboto vía `undefined` fontFamily).
 * Cifras siempre con `tabular-nums` — sin esto las columnas de montos
 * bailan al hacer scroll (PLAN-frontend §4.3).
 */
export type TypographyToken = Pick<
  TextStyle,
  "fontSize" | "fontWeight" | "fontVariant" | "lineHeight"
>;

const TABULAR: TextStyle["fontVariant"] = ["tabular-nums"];

export const typography: Record<
  "display" | "title1" | "title2" | "body" | "bodyStrong" | "caption" | "micro",
  TypographyToken
> = {
  display: { fontSize: 40, fontWeight: "600", lineHeight: 48, fontVariant: TABULAR },
  title1: { fontSize: 28, fontWeight: "600", lineHeight: 34 },
  title2: { fontSize: 20, fontWeight: "600", lineHeight: 26 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: "600", lineHeight: 22, fontVariant: TABULAR },
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: "500", lineHeight: 14 },
};
