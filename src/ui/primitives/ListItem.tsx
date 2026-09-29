import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { Ionicons } from "@expo/vector-icons";

import { Icon } from "@/ui/primitives/Icon";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Cifra o cualquier nodo a la derecha (normalmente un `MoneyText`). */
  trailing?: ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Nodo propio al inicio (un `Dot`, un avatar). Tiene prioridad sobre `icon`. */
  leading?: ReactNode;
  onPress?: () => void;
  /** Muestra `›` al final. Por defecto sí cuando hay `onPress`. */
  chevron?: boolean;
  /** Última fila de un bloque: sin divisor inferior. */
  last?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * Fila estándar de listas (movimientos, cuentas, suscripciones, deudas…).
 * Reemplaza las ~17 filas hechas a mano con `borderBottom`. Área táctil
 * mínima 48 pt y crece con la fuente del sistema — nunca una altura fija.
 */
export function ListItem({
  title,
  subtitle,
  trailing,
  icon,
  leading,
  onPress,
  chevron,
  last = false,
  disabled = false,
  accessibilityLabel,
}: ListItemProps) {
  const { spacing, colors, minTouchTarget, opacity, stroke } = useTokens();
  const showChevron = chevron ?? Boolean(onPress);

  const content = (
    <>
      {leading ?? (icon ? <Icon name={icon} /> : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? <Icon name="chevron-forward" size={16} color={colors.text.tertiary} /> : null}
    </>
  );

  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing[3],
    minHeight: minTouchTarget,
    paddingVertical: spacing[2],
    borderBottomWidth: last ? 0 : stroke.hairline,
    borderBottomColor: colors.border.subtle,
  };

  if (!onPress) {
    return (
      <View style={rowStyle} accessibilityLabel={accessibilityLabel} accessible={Boolean(accessibilityLabel)}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        rowStyle,
        { opacity: disabled ? opacity.disabled : pressed ? opacity.pressedSubtle : 1 },
      ]}
    >
      {content}
    </Pressable>
  );
}
