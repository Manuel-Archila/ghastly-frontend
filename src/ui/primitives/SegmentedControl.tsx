import { Pressable, View } from "react-native";

import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Grupo de segmentos (Reportes: Resumen/Categorías/Tendencias/Comparativo)
 * — cada opción es su propia ruta, esto solo pinta cuál está activa y
 * dispara `onChange` (el llamador hace `router.replace`). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, spacing, radii, minTouchTarget } = useTokens();

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.bg.sunken,
        borderRadius: radii.md,
        padding: 2,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              minHeight: minTouchTarget - 8,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.sm,
              paddingHorizontal: spacing[1],
              backgroundColor: selected ? colors.bg.surface : "transparent",
            }}
          >
            <Text
              variant="caption"
              numberOfLines={1}
              style={{ color: selected ? colors.text.primary : colors.text.secondary }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
