import { useCallback, useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { deleteAccount } from "@/data/api/accounts";
import { ApiError } from "@/data/api/client";
import {
  listAccounts,
  markAccountArchivedLocally,
  type Account,
} from "@/data/repositories/accounts";
import { getHiddenAccountIds, setAccountHidden } from "@/lib/hiddenAccounts";
import {
  Button,
  Card,
  FadeIn,
  ListItem,
  MoneyText,
  Screen,
  ScreenState,
  Text,
  showToast,
} from "@/ui/primitives";
import { confirmDestructive } from "@/ui/confirm";
import { useTokens } from "@/ui/tokens";

export default function AccountsScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [accs, hiddenIds] = await Promise.all([listAccounts(), getHiddenAccountIds()]);
    setAccounts(accs);
    setHidden(hiddenIds);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onToggleHidden(id: string, value: boolean) {
    await setAccountHidden(id, value);
    setHidden((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function performDelete(id: string, force: boolean) {
    setBusyId(id);
    try {
      await deleteAccount(id, force);
      await markAccountArchivedLocally(id);
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.code === "ACCOUNT_HAS_BALANCE") {
        const archiveAnyway = await confirmDestructive(
          "La cuenta tiene saldo",
          "Todavía tiene un saldo distinto de cero. ¿Archivarla igual?",
          "Archivar igual",
        );
        if (archiveAnyway) void performDelete(id, true);
      } else {
        showToast({ message: e instanceof ApiError ? e.message : "No se pudo borrar. Intentá de nuevo." });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete(account: Account) {
    const ok = await confirmDestructive(
      "Borrar cuenta",
      `"${account.name}" se archiva — deja de aparecer en la app, pero su historial se conserva.`,
      "Borrar",
    );
    if (ok) void performDelete(account.id, false);
  }

  const status = !loaded ? "loading" : accounts.length === 0 ? "empty" : "data";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Cuentas" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        <ScreenState
          status={status}
          empty={{
            message: "Todavía no tenés cuentas.",
            icon: "wallet-outline",
            actionLabel: "Nueva cuenta",
            onAction: () => router.push("/accounts/new"),
          }}
        >
          {accounts.map((a, index) => (
            <FadeIn key={a.id} delay={index * 30}>
              <Card style={{ gap: spacing[1] }}>
                <ListItem
                  title={a.name}
                  subtitle={a.currency}
                  trailing={<MoneyText cents={a.currentBalanceCents} currency={a.currency} />}
                  onPress={() => router.push(`/accounts/${a.id}`)}
                  accessibilityLabel={`${a.name}, editar`}
                  last
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: spacing[3],
                  }}
                >
                  <Text variant="caption" color="secondary" style={{ flex: 1 }}>
                    Ocultar en Hoy
                  </Text>
                  <Switch
                    accessibilityLabel={`Ocultar ${a.name} en Hoy`}
                    value={hidden.has(a.id)}
                    onValueChange={(v) => void onToggleHidden(a.id, v)}
                    trackColor={{ false: colors.border.control, true: colors.accent.bg }}
                  />
                  <Button
                    label={busyId === a.id ? "Borrando…" : "Borrar"}
                    variant="danger"
                    fullWidth={false}
                    disabled={busyId === a.id}
                    onPress={() => void confirmDelete(a)}
                  />
                </View>
              </Card>
            </FadeIn>
          ))}
          <Button label="Nueva cuenta" onPress={() => router.push("/accounts/new")} />
        </ScreenState>
      </ScrollView>
    </Screen>
  );
}
