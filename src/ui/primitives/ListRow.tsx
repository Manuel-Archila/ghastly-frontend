import { Pressable } from "react-native";
import type { Ionicons } from "@expo/vector-icons";

import { Icon } from "@/ui/primitives/Icon";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface ListRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  summary?: string;
  onPress: () => void;
}

/** Fila de navegación (Más, Ajustes). Crece con la fuente del sistema. */
export function ListRow({ icon, label, summary, onPress }: ListRowProps) {
  const { spacing, colors, minTouchTarget } = useTokens();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={summary ? `${label}, ${summary}` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
        minHeight: minTouchTarget,
        paddingVertical: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} />
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant="caption" color="tertiary">
        {summary ? `${summary} ›` : "›"}
      </Text>
    </Pressable>
  );
}
