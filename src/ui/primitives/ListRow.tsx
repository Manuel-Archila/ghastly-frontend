import { Pressable, View } from "react-native";
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
  const { spacing, colors, minTouchTarget, opacity, stroke, iconSize } = useTokens();
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
        borderBottomWidth: stroke.hairline,
        borderBottomColor: colors.border.subtle,
        opacity: pressed ? opacity.pressedSubtle : 1,
      })}
    >
      <Icon name={icon} />
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
        {summary ? (
          <Text variant="caption" color="secondary">
            {summary}
          </Text>
        ) : null}
        <Icon name="chevron-forward" size={iconSize.sm} color={colors.text.tertiary} />
      </View>
    </Pressable>
  );
}
