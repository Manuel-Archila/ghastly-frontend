import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { deleteAccount } from "@/data/api/accounts";
import {
  listAccounts,
  markAccountArchivedLocally,
  type Account,
} from "@/data/repositories/accounts";
import { deferDelete, useDeleteVersion, useIsHiddenByDelete } from "@/features/undo/deferred-delete";
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
} from "@/ui/primitives";
import { confirmDestructive } from "@/ui/confirm";
import { useTokens } from "@/ui/tokens";

export default function AccountsScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [allAccounts, setAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);
  // "Ocultar en Hoy": preferencia local del usuario, distinta de un borrado.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const isHiddenByDelete = useIsHiddenByDelete();
  const deleteVersion = useDeleteVersion();

  const load = useCallback(() => {
    void Promise.all([listAccounts(), getHiddenAccountIds()]).then(([accs, hiddenIds]) => {
      setAccounts(accs);
      setHidden(hiddenIds);
      setLoaded(true);
    });
  }, []);

  useFocusEffect(load);

  // También se recarga cada vez que termina un borrado.
  useEffect(() => {
    if (deleteVersion > 0) load();
  }, [deleteVersion, load]);

  // Lo que está por archivarse (aviso de Deshacer en curso) ya no se muestra.
  const accounts = useMemo(
    () => allAccounts.filter((a) => !isHiddenByDelete("account", a.id)),
    [allAccounts, isHiddenByDelete],
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

  async function onDelete(account: Account) {
    // Con saldo, el servidor exige confirmar (409). Con el borrado diferido ese
    // error llegaría 5 s después, cuando el usuario ya se fue: se pregunta antes,
    // con el saldo que conocemos localmente.
    let force = false;
    if (account.currentBalanceCents !== 0) {
      const archiveAnyway = await confirmDestructive(
        "La cuenta tiene saldo",
        `"${account.name}" todavía tiene un saldo distinto de cero. ¿Archivarla igual?`,
        "Archivar igual",
      );
      if (!archiveAnyway) return;
      force = true;
    }
    // Sin diálogo si no tiene saldo: se oculta ya y el aviso ofrece Deshacer. El
    // API se llama cuando expira; el historial de la cuenta se conserva.
    deferDelete({
      entity: "account",
      id: account.id,
      message: `${account.name} archivada`,
      failureMessage: "No se pudo archivar la cuenta.",
      perform: async () => {
        await deleteAccount(account.id, force);
        await markAccountArchivedLocally(account.id);
      },
    });
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
                    label="Borrar"
                    variant="danger"
                    fullWidth={false}
                    onPress={() => void onDelete(a)}
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
