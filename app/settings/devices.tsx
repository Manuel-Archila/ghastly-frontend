import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";

import { listDevices, revokeDevice, type DeviceOut } from "@/data/api/devices";
import { errorMessageFor } from "@/data/api/error-messages";
import { useSessionStore } from "@/features/auth/session-store";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import { confirmDestructive } from "@/ui/confirm";
import { Button, Card, FadeIn, Notice, Screen, Skeleton, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

/** Solo los últimos caracteres del token: nunca el push_token completo. */
function maskToken(token: string | null): string {
  return token ? `…${token.slice(-6)}` : "sin notificaciones";
}

export default function DevicesScreen() {
  const { spacing } = useTokens();
  const logout = useSessionStore((s) => s.logout);

  const [devices, setDevices] = useState<DeviceOut[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDevices(await listDevices());
    } catch (e) {
      setError(errorMessageFor(e, "No se pudieron cargar los dispositivos."));
      setDevices((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void getOrCreateDeviceId().then(setCurrentId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onRevoke(device: DeviceOut) {
    const isCurrent = device.id === currentId;
    const ok = await confirmDestructive(
      isCurrent ? "Cerrar sesión en este dispositivo" : "Revocar dispositivo",
      isCurrent
        ? "Este es el dispositivo que estás usando: se cierra tu sesión aquí."
        : `${device.platform} deja de tener acceso y tendrá que iniciar sesión de nuevo.`,
      isCurrent ? "Cerrar sesión" : "Revocar",
    );
    if (!ok) return;
    setBusyId(device.id);
    try {
      await revokeDevice(device.id);
      if (isCurrent) {
        await logout();
        return;
      }
      await load();
    } catch (e) {
      setError(errorMessageFor(e));
    }
    setBusyId(null);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Dispositivos" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[3], paddingVertical: spacing[4] }}>
        {error ? <Notice tone="danger" text={error} /> : null}

        {devices === null ? (
          <View style={{ gap: spacing[3] }}>
            <Skeleton height={88} />
            <Skeleton height={88} />
          </View>
        ) : devices.length === 0 && !error ? (
          <Text variant="body" color="secondary">
            No hay dispositivos registrados.
          </Text>
        ) : (
          devices.map((d, index) => {
            const isCurrent = d.id === currentId;
            return (
              <FadeIn key={d.id} delay={index * 30}>
                <Card style={{ gap: spacing[2] }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text variant="bodyStrong">{d.platform}</Text>
                    {isCurrent ? (
                      <Text variant="caption" color="secondary">
                        Este dispositivo
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="caption" color="tertiary">
                    {d.app_version ? `Versión ${d.app_version} · ` : ""}
                    {d.last_seen_at ? `Visto ${d.last_seen_at.slice(0, 10)}` : "Sin actividad"}
                  </Text>
                  <Text variant="caption" color="tertiary">
                    Push: {maskToken(d.push_token)}
                  </Text>
                  <Button
                    label={isCurrent ? "Cerrar sesión aquí" : "Revocar"}
                    variant="danger"
                    fullWidth={false}
                    disabled={busyId === d.id}
                    onPress={() => void onRevoke(d)}
                  />
                </Card>
              </FadeIn>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
