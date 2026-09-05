import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { listAccounts, type Account } from "@/data/repositories/accounts";
import { countPendingOutbox } from "@/data/repositories/transactions";
import { runSync } from "@/data/sync";
import { Money } from "@/domain/money";
import { Button, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

const LIABILITY_TYPES = new Set(["credit_card", "loan"]);

export default function TodayScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const [accs, count] = await Promise.all([listAccounts(), countPendingOutbox()]);
    setAccounts(accs);
    setPending(count);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onSync = useCallback(async () => {
    setSyncing(true);
    try {
      await runSync();
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  const netWorthCents = accounts.reduce(
    (sum, a) =>
      LIABILITY_TYPES.has(a.type)
        ? sum - a.currentBalanceCents
        : sum + a.currentBalanceCents,
    0,
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ gap: spacing[5], paddingVertical: spacing[4] }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={onSync} />}
      >
        <View style={{ gap: spacing[1] }}>
          <Text variant="caption" color="secondary">
            PATRIMONIO NETO
          </Text>
          <Text variant="display">{new Money(netWorthCents).format()}</Text>
          {pending > 0 ? (
            <Text variant="caption" style={{ color: colors.warning.fg }}>
              {pending} sin sincronizar
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          <Button
            label="Registrar gasto"
            onPress={() => router.push("/(modals)/quick-add")}
            fullWidth={false}
            style={{ flex: 1 }}
          />
          <Button
            label={syncing ? "Sincronizando…" : "Sincronizar"}
            variant="secondary"
            onPress={onSync}
            disabled={syncing}
            fullWidth={false}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" color="secondary">
            CUENTAS
          </Text>
          {accounts.length === 0 ? (
            <View style={{ gap: spacing[3] }}>
              <Text variant="body" color="secondary">
                Todavía no hay cuentas.
              </Text>
              <Button label="Crear la primera" onPress={() => router.push("/accounts/new")} />
            </View>
          ) : (
            <>
              {accounts.map((a) => (
                <View
                  key={a.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: spacing[2],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.subtle,
                  }}
                >
                  <Text variant="body">{a.name}</Text>
                  <Text
                    variant="bodyStrong"
                    style={{
                      color: LIABILITY_TYPES.has(a.type)
                        ? colors.expense.fg
                        : colors.text.primary,
                    }}
                  >
                    {new Money(a.currentBalanceCents).format()}
                  </Text>
                </View>
              ))}
              <Button
                label="Nueva cuenta"
                variant="ghost"
                onPress={() => router.push("/accounts/new")}
              />
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
