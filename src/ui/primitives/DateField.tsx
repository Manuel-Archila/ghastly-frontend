import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { Icon } from "@/ui/primitives/Icon";
import { Text } from "@/ui/primitives/Text";
import { useTokens } from "@/ui/tokens";

export interface DateFieldProps {
  label?: string;
  /** Fecha en `AAAA-MM-DD` (mismo formato que el resto de la app). */
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
}

/** Selector de fecha con el calendario nativo del sistema — reemplaza el
 * texto libre "AAAA-MM-DD" en formularios donde la fecha no siempre es hoy
 * (una suscripción con cobro a mitad de mes, por ejemplo). */
export function DateField({ label, value, onChange, minimumDate }: DateFieldProps) {
  const { colors, spacing, radii, minTouchTarget, opacity, stroke, iconSize } = useTokens();
  const [open, setOpen] = useState(false);

  const parsed = parseISO(value);
  const display = Number.isNaN(parsed.getTime())
    ? value
    : format(parsed, "d 'de' MMMM 'de' yyyy", { locale: es });

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    // Android cierra el diálogo solo; iOS (spinner inline) se queda abierto
    // hasta que el usuario confirme con otro control.
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "set" && selected) {
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, "0");
      const d = String(selected.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    }
  }

  return (
    <View style={{ gap: spacing[1] }}>
      {label ? (
        <Text variant="caption" color="secondary">
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${display}` : display}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          {
            minHeight: minTouchTarget,
            borderRadius: radii.sm,
            borderWidth: stroke.hairline,
            borderColor: colors.border.control,
            paddingHorizontal: spacing[3],
            backgroundColor: colors.bg.surface,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: pressed ? opacity.pressed : 1,
          },
        ]}
      >
        <Text variant="body">{display}</Text>
        <Icon name="calendar-outline" size={iconSize.md} color={colors.text.secondary} />
      </Pressable>
      {open ? (
        <DateTimePicker
          value={Number.isNaN(parsed.getTime()) ? new Date() : parsed}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
