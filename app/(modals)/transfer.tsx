import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { listAccounts, type Account } from "@/data/repositories/accounts";
import { createTransferLocally } from "@/data/repositories/transactions";
import { triggerSync } from "@/features/sync/sync-manager";
import { Money, parseCentsFromInput } from "@/domain/money";
import { todayIso } from "@/lib/dates";
import { Button, Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";
import { accountLabel } from "@/features/accounts/account-label";

function today(): string {
  return todayIso();
}

export default function TransferScreen() {
  const router = useRouter();
  const { spacing, colors } = useTokens();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listAccounts().then((accs) => {
      setAccounts(accs);
      setFromId(accs[0]?.id ?? null);
      setToId(accs[1]?.id ?? null);
    });
  }, []);

  const cents = parseCentsFromInput(amount);
  const toIsCard = accounts.find((a) => a.id === toId)?.type === "credit_card";
  const canSave = cents !== null && fromId !== null && toId !== null && fromId !== toId && !busy;

  async function onSave() {
    if (cents === null || fromId === null || toId === null) return;
    setBusy(true);
    await createTransferLocally({
      fromAccountId: fromId,
      toAccountId: toId,
      amountCents: cents,
      date: today(),
      description: toIsCard ? "Pago de tarjeta" : null,
    });
    triggerSync();
    router.back();
  }

  return (
    <Screen style={{ paddingTop: spacing[4] }}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="title1">{toIsCard ? "Pago de tarjeta" : "Transferencia"}</Text>
          <Button label="Cerrar" variant="ghost" fullWidth={false} onPress={() => router.back()} />
        </View>

        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          <Chip label="Gasto" onPress={() => router.replace("/(modals)/quick-add")} />
          <Chip label="Ingreso" onPress={() => router.replace("/(modals)/quick-add?kind=income")} />
          <Chip label="Transferencia" selected />
        </View>

        <View style={{ alignItems: "center", paddingVertical: spacing[3] }}>
          <Text variant="display" style={{ color: colors.transfer.fg }}>
            {cents !== null ? `${new Money(cents).format()} →` : "Q 0.00 →"}
          </Text>
        </View>

        <Input
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          autoFocus
          placeholder="Monto"
          style={{ textAlign: "center" }}
        />

        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" color="secondary">
            Desde
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {accounts.map((a) => (
              <Chip key={a.id} label={accountLabel(a)} selected={fromId === a.id} onPress={() => setFromId(a.id)} />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" color="secondary">
            Hacia
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {accounts.map((a) => (
              <Chip key={a.id} label={accountLabel(a)} selected={toId === a.id} onPress={() => setToId(a.id)} />
            ))}
          </View>
        </View>

        {fromId === toId ? (
          <Text variant="caption" style={{ color: colors.danger.fg }}>
            La cuenta origen y destino no pueden ser la misma.
          </Text>
        ) : null}

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={!canSave} />
      </ScrollView>
    </Screen>
  );
}
