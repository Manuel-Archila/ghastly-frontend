import { useEffect, useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { useNotificationPreferences } from "@/features/notifications/useNotificationPreferences";
import { Button, Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const THRESHOLD_OPTIONS = [50, 80, 90, 100];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toHHMM(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const { spacing } = useTokens();
  const { preferences, isLoading, save } = useNotificationPreferences();

  const [thresholds, setThresholds] = useState<number[]>([]);
  const [dueReminderDays, setDueReminderDays] = useState("3");
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [timeError, setTimeError] = useState("");

  useEffect(() => {
    if (!preferences) return;
    // Seedea el form editable una sola vez cuando llega el dato del
    // server (mismo patrón que app/budget/edit.tsx).
    void (async () => {
      setThresholds(preferences.budget_alert_thresholds);
      setDueReminderDays(String(preferences.due_reminder_days));
      setQuietHoursEnabled(Boolean(preferences.quiet_hours_start && preferences.quiet_hours_end));
      setQuietStart(toHHMM(preferences.quiet_hours_start));
      setQuietEnd(toHHMM(preferences.quiet_hours_end));
      setPushEnabled(preferences.channels.includes("push"));
    })();
  }, [preferences]);

  function toggleThreshold(value: number) {
    setThresholds((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  async function onSave() {
    setTimeError("");
    if (quietHoursEnabled && (!TIME_PATTERN.test(quietStart) || !TIME_PATTERN.test(quietEnd))) {
      setTimeError("Usá el formato HH:MM, por ejemplo 22:00.");
      return;
    }

    setBusy(true);
    try {
      await save({
        budget_alert_thresholds: thresholds.length > 0 ? thresholds : [80, 100],
        due_reminder_days: Number(dueReminderDays) || 0,
        quiet_hours_start: quietHoursEnabled ? `${quietStart}:00` : null,
        quiet_hours_end: quietHoursEnabled ? `${quietEnd}:00` : null,
        channels: pushEnabled ? ["push"] : [],
      });
      router.back();
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Notificaciones" }} />
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Notificaciones" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingBottom: spacing[8] }}>
        <View style={{ gap: spacing[2] }}>
          <Text variant="body">Avisar cuando el gasto llegue a</Text>
          <Text variant="caption" color="tertiary">
            Umbrales de presupuesto — podés elegir más de uno.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {THRESHOLD_OPTIONS.map((value) => (
              <Chip
                key={value}
                label={`${value}%`}
                selected={thresholds.includes(value)}
                onPress={() => toggleThreshold(value)}
              />
            ))}
          </View>
        </View>

        <Input
          label="Avisar cuotas próximas a vencer con cuántos días de anticipación"
          value={dueReminderDays}
          onChangeText={setDueReminderDays}
          keyboardType="number-pad"
          placeholder="3"
        />

        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        >
          <View style={{ flex: 1, paddingRight: spacing[3] }}>
            <Text variant="body">Horas de silencio</Text>
            <Text variant="caption" color="tertiary">
              No se manda ningún push en esta ventana.
            </Text>
          </View>
          <Switch value={quietHoursEnabled} onValueChange={setQuietHoursEnabled} />
        </View>

        {quietHoursEnabled ? (
          <View style={{ flexDirection: "row", gap: spacing[3] }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Desde"
                value={quietStart}
                onChangeText={setQuietStart}
                placeholder="22:00"
                error={timeError || undefined}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Hasta" value={quietEnd} onChangeText={setQuietEnd} placeholder="07:00" />
            </View>
          </View>
        ) : null}

        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        >
          <View style={{ flex: 1, paddingRight: spacing[3] }}>
            <Text variant="body">Notificaciones push</Text>
            <Text variant="caption" color="tertiary">
              Apagalas del todo sin perder tus umbrales configurados.
            </Text>
          </View>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} />
        </View>

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={busy} />
      </ScrollView>
    </Screen>
  );
}
