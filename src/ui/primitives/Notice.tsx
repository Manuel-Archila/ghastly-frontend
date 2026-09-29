import { View } from "react-native";
import type { Ionicons } from "@expo/vector-icons";

import { Icon } from "@/ui/primitives/Icon";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export type NoticeTone = "warning" | "danger" | "info" | "success";

export interface NoticeProps {
  tone?: NoticeTone;
  text: string;
}

const ICONS: Record<NoticeTone, keyof typeof Ionicons.glyphMap> = {
  warning: "warning-outline",
  danger: "close-circle-outline",
  info: "information-circle-outline",
  success: "checkmark-circle-outline",
};

/** Aviso en línea, persistente y no bloqueante. Cada tono lleva su propio
 * ícono además del color: el color solo nunca es el portador del mensaje. */
export function Notice({ tone = "warning", text }: NoticeProps) {
  const { colors, spacing, radii } = useTokens();
  const palette = colors[tone];
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing[2],
        padding: spacing[3],
        borderRadius: radii.sm,
        backgroundColor: palette.bg,
      }}
    >
      <Icon name={ICONS[tone]} color={palette.fg} />
      <Text variant="caption" style={{ flex: 1, color: palette.fg }}>
        {text}
      </Text>
    </View>
  );
}
