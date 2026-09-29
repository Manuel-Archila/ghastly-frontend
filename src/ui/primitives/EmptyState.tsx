import { View } from "react-native";
import type { Ionicons } from "@expo/vector-icons";

import { Button } from "@/ui/primitives/Button";
import { Icon } from "@/ui/primitives/Icon";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface EmptyStateProps {
  /** Una frase directa, sin juicio: qué falta y qué se puede hacer. */
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

/** Estado vacío: frase + la acción que lo resuelve (CLAUDE.md, "Estados"). */
export function EmptyState({ message, icon, actionLabel, onAction }: EmptyStateProps) {
  const { spacing, colors, iconSize } = useTokens();
  return (
    <View style={{ alignItems: "center", gap: spacing[3], paddingVertical: spacing[8] }}>
      {icon ? <Icon name={icon} size={iconSize.xl} color={colors.text.tertiary} /> : null}
      <Text variant="body" color="secondary" style={{ textAlign: "center" }}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} />
      ) : null}
    </View>
  );
}
