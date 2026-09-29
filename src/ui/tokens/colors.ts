/**
 * Semántica de color fija en toda la app (PLAN-frontend §4.2). El color
 * informa, nunca decora — nunca es el único portador de significado (todo
 * monto lleva signo, todo estado lleva icono o texto además del color).
 *
 * Paleta "Cobalto": acento azul sobre grises neutros. Todos los pares de
 * texto cumplen 4.5:1 y los bordes de control 3:1, en claro y oscuro
 * (verificado con WCAG 2.x). `accent.fg` cambia por modo: blanco sobre el
 * cobalto oscuro del modo claro, tinta oscura sobre el cobalto claro del
 * modo oscuro. Cambiar la marca es tocar este único archivo.
 */

export interface ColorTokens {
  bg: { base: string; surface: string; elevated: string; sunken: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string };
  /** `subtle`: divisores y contorno de tarjetas (decorativo, sin mínimo).
   * `control`: borde de Input/Chip/Switch, ≥ 3:1 contra la superficie
   * (WCAG 1.4.11). `strong`: énfasis intermedio. */
  border: { subtle: string; strong: string; control: string };
  income: { fg: string; bg: string };
  expense: { fg: string; bg: string };
  transfer: { fg: string; bg: string };
  warning: { fg: string; bg: string };
  danger: { fg: string; bg: string };
  /** Confirmaciones que no son dinero (guardado, sincronizado). Mismo verde
   * que ingreso a propósito: el color de "bien" es uno solo. */
  success: { fg: string; bg: string };
  info: { fg: string; bg: string };
  accent: { fg: string; bg: string };
  /** Velo detrás de sheets y diálogos. */
  scrim: string;
  /** Paleta para gráficas de categorías (Reportes) — orden fijo, nunca
   * ciclado (skill `dataviz`): azul/naranja/aqua/amarillo/magenta/verde,
   * 6 slots validados para pares adyacentes (donut) en ambos modos.
   * `categoryColorFor` (`lib/categoryColor.ts`) asigna un slot fijo por
   * `category_id` — nunca por posición/ranking, para que el color de una
   * categoría no cambie de pantalla en pantalla. */
  categorical: string[];
  categoricalOther: string;
}

export const lightColors: ColorTokens = {
  bg: { base: "#F4F5F7", surface: "#FFFFFF", elevated: "#FFFFFF", sunken: "#E8EAEE" },
  text: { primary: "#111319", secondary: "#4B5261", tertiary: "#5F6676", inverse: "#FFFFFF" },
  border: { subtle: "#D3D7DF", strong: "#B4BAC6", control: "#778092" },
  income: { fg: "#12703F", bg: "#E3F4EA" },
  expense: { fg: "#B93A30", bg: "#FBE9E7" },
  transfer: { fg: "#5B6270", bg: "#ECEDF0" },
  warning: { fg: "#84550A", bg: "#FFF1D4" },
  danger: { fg: "#B42318", bg: "#FCE8E5" },
  success: { fg: "#12703F", bg: "#E3F4EA" },
  info: { fg: "#1D5FA8", bg: "#E6EFFA" },
  accent: { fg: "#FFFFFF", bg: "#1F4FD8" },
  scrim: "rgba(17, 19, 25, 0.45)",
  categorical: ["#2A78D6", "#EB6834", "#1BAF7A", "#EDA100", "#E87BA4", "#008300"],
  categoricalOther: "#778092",
};

export const darkColors: ColorTokens = {
  bg: { base: "#0B0D12", surface: "#141720", elevated: "#1C202B", sunken: "#06070B" },
  text: { primary: "#F1F3F7", secondary: "#A9AFBD", tertiary: "#8C93A3", inverse: "#0B0D12" },
  border: { subtle: "#292E3A", strong: "#444B5C", control: "#626A7D" },
  income: { fg: "#3DDC84", bg: "#12311F" },
  expense: { fg: "#FF7B70", bg: "#3A1714" },
  transfer: { fg: "#A0A7B8", bg: "#22262F" },
  warning: { fg: "#FFC24B", bg: "#3A2A08" },
  danger: { fg: "#FF7168", bg: "#3A1512" },
  success: { fg: "#3DDC84", bg: "#12311F" },
  info: { fg: "#7DB4F2", bg: "#132538" },
  accent: { fg: "#08122E", bg: "#88A6FF" },
  scrim: "rgba(0, 0, 0, 0.6)",
  categorical: ["#3987E5", "#D95926", "#199E70", "#C98500", "#D55181", "#008300"],
  categoricalOther: "#8C93A3",
};
