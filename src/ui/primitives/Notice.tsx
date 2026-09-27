import { View } from "react-native";

import { Icon } from "@/ui/primitives/Icon";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface NoticeProps {
  tone?: "warning" | "danger";
  text: string;
}

/** Aviso en línea, persistente y no bloqueante. Lleva ícono + texto: el
 * color solo nunca es el único portador del mensaje. */
export function Notice({ tone = "warning", text }: NoticeProps) {
  const { colors, spacing, radii } = useTokens();
  const palette = tone === "danger" ? colors.danger : colors.warning;
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
      <Icon name="alert-circle-outline" color={palette.fg} />
      <Text variant="caption" style={{ flex: 1, color: palette.fg }}>
        {text}
      </Text>
    </View>
  );
}
