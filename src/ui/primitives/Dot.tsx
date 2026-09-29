import { View } from "react-native";

import { useTokens } from "@/ui/tokens";

export interface DotProps {
  color: string;
  size?: "sm" | "md";
}

/** Punto de leyenda. Decorativo: el significado va siempre en el texto
 * de al lado, nunca solo en el color. */
export function Dot({ color, size = "sm" }: DotProps) {
  const { dot, radii } = useTokens();
  const side = dot[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: side, height: side, borderRadius: radii.full, backgroundColor: color }}
    />
  );
}
