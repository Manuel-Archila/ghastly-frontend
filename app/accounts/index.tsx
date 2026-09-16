import { useCallback, useState } from "react";
import { Alert, ScrollView, Switch, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { deleteAccount } from "@/data/api/accounts";
import { ApiError } from "@/data/api/client";
import {
  listAccounts,
  markAccountArchivedLocally,
  type Account,
} from "@/data/repositories/accounts";
import { getHiddenAccountIds, setAccountHidden } from "@/lib/hiddenAccounts";
import { Money } from "@/domain/money";
import { Button, FadeIn, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function AccountsScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [accs, hiddenIds] = await Promise.all([listAccounts(), getHiddenAccountIds()]);
    setAccounts(accs);
    setHidden(hiddenIds);
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
        Alert.alert(
          "La cuenta tiene saldo",
          "Todavía tiene un saldo distinto de cero. ¿Archivarla igual?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Archivar igual",
              style: "destructive",
              onPress: () => void performDelete(id, true),
            },
          ],
        );
      } else {
        Alert.alert("No se pudo borrar", e instanceof ApiError ? e.message : "Intentá de nuevo.");
      }
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(account: Account) {
    Alert.alert(
      "Borrar cuenta",
      `"${account.name}" se archiva — deja de aparecer en la app, pero su historial se conserva.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Borrar", style: "destructive", onPress: () => void performDelete(account.id, false) },
      ],
    );
  }

  return (
    <Screen style={{ paddingTop: spacing[5] }}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Button label="Volver" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        <Text variant="title1">Cuentas</Text>

        {accounts.length === 0 ? (
          <Text variant="body" color="secondary">
            Todavía no tenés cuentas.
          </Text>
        ) : (
          accounts.map((a, index) => (
            <FadeIn key={a.id} delay={index * 30}>
              <View
                style={{
                  gap: spacing[2],
                  paddingBottom: spacing[3],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.subtle,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text variant="body">{a.name}</Text>
                  <Text variant="bodyStrong">{new Money(a.currentBalanceCents).format()}</Text>
                </View>

                <View
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Text variant="caption" color="secondary">
                    Ocultar en Hoy
                  </Text>
                  <Switch
                    value={hidden.has(a.id)}
                    onValueChange={(v) => void onToggleHidden(a.id, v)}
                  />
                </View>

                <Button
                  label={busyId === a.id ? "Borrando…" : "Borrar cuenta"}
                  variant="danger"
                  fullWidth={false}
                  disabled={busyId === a.id}
                  onPress={() => confirmDelete(a)}
                />
              </View>
            </FadeIn>
          ))
        )}

        <Button label="+ Nueva cuenta" onPress={() => router.push("/accounts/new")} />
      </ScrollView>
    </Screen>
  );
}
