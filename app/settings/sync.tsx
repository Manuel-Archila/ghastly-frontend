import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";

import {
  discardOutboxMutation,
  listPendingOutbox,
  MAX_OUTBOX_ATTEMPTS,
  outboxEntityLabel,
  outboxOpLabel,
  resetOutboxAttempts,
  type OutboxMutation,
} from "@/data/repositories/outbox";
import { runSync } from "@/data/sync";
import { confirmDestructive } from "@/ui/confirm";
import { showToast } from "@/ui/toast";
import { Button, FadeIn, ListItem, Notice, ScreenState, SectionHeader, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

/**
 * Qué se quedó sin sincronizar y por qué, con botón para reintentar o
 * descartar. Antes de esta pantalla, una mutación que fallaba 5 veces
 * (push.ts::MAX_ATTEMPTS) se quedaba en el buzón de salida para siempre,
 * sin que nada lo mostrara ni dejara desatascarla.
 */
export default function SyncStatusScreen() {
  const { spacing } = useTokens();
  const [items, setItems] = useState<OutboxMutation[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(await listPendingOutbox());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onSyncNow() {
    setSyncing(true);
    try {
      await runSync();
      await load();
      showToast({ message: "Sincronizado." });
    } catch {
      showToast({ message: "No se pudo sincronizar. Revisá tu conexión." });
    } finally {
      setSyncing(false);
    }
  }

  async function onRetry(m: OutboxMutation) {
    setBusyId(m.clientMutationId);
    try {
      await resetOutboxAttempts(m.clientMutationId);
      await runSync();
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onDiscard(m: OutboxMutation) {
    const ok = await confirmDestructive(
      "Descartar cambio pendiente",
      `Ese cambio (${outboxOpLabel(m.op).toLowerCase()} · ${outboxEntityLabel(m.entityType).toLowerCase()}) nunca se va a mandar al servidor. Lo que ya tengas guardado local no se toca, solo se olvida el reintento.`,
      "Descartar",
    );
    if (!ok) return;
    setBusyId(m.clientMutationId);
    try {
      await discardOutboxMutation(m.clientMutationId);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const stuck = items?.filter((m) => m.attempts >= MAX_OUTBOX_ATTEMPTS) ?? [];
  const pending = items?.filter((m) => m.attempts < MAX_OUTBOX_ATTEMPTS) ?? [];
  const status = items === null ? "loading" : items.length === 0 ? "empty" : "data";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Sincronización" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}>
        <Button label={syncing ? "Sincronizando…" : "Sincronizar ahora"} onPress={onSyncNow} disabled={syncing} />

        <ScreenState
          status={status}
          skeleton="list"
          empty={{ message: "Todo sincronizado. No hay nada pendiente.", icon: "checkmark-circle-outline" }}
        >
          {stuck.length > 0 ? (
            <View style={{ gap: spacing[3] }}>
              <SectionHeader label="Atascadas" />
              <Notice
                tone="danger"
                text={`Fallaron ${MAX_OUTBOX_ATTEMPTS} veces seguidas y la app dejó de reintentarlas sola.`}
              />
              <View>
                {stuck.map((m, index) => (
                  <FadeIn key={m.clientMutationId} delay={index * 30}>
                    <ListItem
                      title={`${outboxOpLabel(m.op)} · ${outboxEntityLabel(m.entityType)}`}
                      subtitle={m.lastError ?? "Sin detalle del error."}
                      last={index === stuck.length - 1}
                    />
                    <View style={{ flexDirection: "row", gap: spacing[2], paddingBottom: spacing[3] }}>
                      <Button
                        label={busyId === m.clientMutationId ? "Reintentando…" : "Reintentar"}
                        variant="secondary"
                        fullWidth={false}
                        disabled={busyId === m.clientMutationId}
                        onPress={() => void onRetry(m)}
                      />
                      <Button
                        label="Descartar"
                        variant="danger"
                        fullWidth={false}
                        disabled={busyId === m.clientMutationId}
                        onPress={() => void onDiscard(m)}
                      />
                    </View>
                  </FadeIn>
                ))}
              </View>
            </View>
          ) : null}

          {pending.length > 0 ? (
            <View>
              <SectionHeader label="Pendientes" />
              <Text variant="caption" color="tertiary" style={{ paddingBottom: spacing[2] }}>
                Todavía no les toca el turno, o están a mitad de camino — normal un rato después de
                guardar algo sin conexión.
              </Text>
              {pending.map((m, index) => (
                <FadeIn key={m.clientMutationId} delay={index * 30}>
                  <ListItem
                    title={`${outboxOpLabel(m.op)} · ${outboxEntityLabel(m.entityType)}`}
                    subtitle={m.attempts > 0 ? `${m.attempts} intento(s)` : undefined}
                    last={index === pending.length - 1}
                  />
                </FadeIn>
              ))}
            </View>
          ) : null}
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
