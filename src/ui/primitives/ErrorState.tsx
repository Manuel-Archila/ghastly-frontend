import { View } from "react-native";

import { Button } from "@/ui/primitives/Button";
import { Icon } from "@/ui/primitives/Icon";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface ErrorStateProps {
  /** Qué pasó, en español. Nunca un código HTTP crudo (CLAUDE.md). */
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/** Estado de error con `Reintentar`. Se anuncia a lectores de pantalla. */
export function ErrorState({ message, onRetry, retryLabel = "Reintentar" }: ErrorStateProps) {
  const { spacing, colors, iconSize } = useTokens();
  return (
    <View
      accessibilityRole="alert"
      style={{ alignItems: "center", gap: spacing[3], paddingVertical: spacing[8] }}
    >
      <Icon name="cloud-offline-outline" size={iconSize.xl} color={colors.danger.fg} />
      <Text variant="body" style={{ textAlign: "center" }}>
        {message}
      </Text>
      {onRetry ? <Button label={retryLabel} variant="secondary" onPress={onRetry} fullWidth={false} /> : null}
    </View>
  );
}
