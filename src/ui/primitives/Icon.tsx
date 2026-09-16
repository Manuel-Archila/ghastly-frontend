import { Ionicons } from "@expo/vector-icons";

import { useTokens } from "@/ui/tokens";

export interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}

/** Único punto de entrada a Ionicons — mantiene un solo set de íconos en
 * toda la app en vez de emoji sueltos por pantalla. */
export function Icon({ name, size = 20, color }: IconProps) {
  const { colors } = useTokens();
  return <Ionicons name={name} size={size} color={color ?? colors.text.secondary} />;
}
