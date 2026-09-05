/**
 * Semántica de color fija en toda la app (PLAN-frontend §4.2). El color
 * informa, nunca decora — nunca es el único portador de significado (todo
 * monto lleva signo, todo estado lleva icono o texto además del color).
 *
 * `accent` es un valor de marca provisional (todavía no hay nombre/marca
 * definitivos — PLAN-frontend §11). Cambiar la marca es tocar este único
 * archivo.
 */

export interface ColorTokens {
  bg: { base: string; surface: string; elevated: string; sunken: string };
  text: { primary: string; secondary: string; tertiary: string; inverse: string };
  border: { subtle: string; strong: string };
  income: { fg: string; bg: string };
  expense: { fg: string; bg: string };
  transfer: { fg: string; bg: string };
  warning: { fg: string; bg: string };
  danger: { fg: string; bg: string };
  accent: { fg: string; bg: string };
}

export const lightColors: ColorTokens = {
  bg: { base: "#F7F8FA", surface: "#FFFFFF", elevated: "#FFFFFF", sunken: "#EEF0F3" },
  text: { primary: "#12141A", secondary: "#5B6270", tertiary: "#9AA1AC", inverse: "#FFFFFF" },
  border: { subtle: "#E4E7EC", strong: "#C7CCD6" },
  income: { fg: "#1F9254", bg: "#E6F6EC" },
  expense: { fg: "#D6483F", bg: "#FCEAE8" },
  transfer: { fg: "#4A5578", bg: "#ECEEF5" },
  warning: { fg: "#9A6300", bg: "#FFF3D9" },
  danger: { fg: "#C4281B", bg: "#FBE7E4" },
  accent: { fg: "#FFFFFF", bg: "#5B4FE8" },
};

export const darkColors: ColorTokens = {
  bg: { base: "#0B0D12", surface: "#14171D", elevated: "#1C2028", sunken: "#05060A" },
  text: { primary: "#F2F3F5", secondary: "#A7ADB8", tertiary: "#6E7480", inverse: "#0B0D12" },
  border: { subtle: "#262B33", strong: "#3A404C" },
  income: { fg: "#34D178", bg: "#123321" },
  expense: { fg: "#FF6B61", bg: "#3A1613" },
  transfer: { fg: "#8792B8", bg: "#1E2433" },
  warning: { fg: "#FFC24B", bg: "#3A2A08" },
  danger: { fg: "#FF6259", bg: "#3A1210" },
  accent: { fg: "#FFFFFF", bg: "#7C72FF" },
};
