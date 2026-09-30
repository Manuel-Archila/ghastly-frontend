import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { errorMessageFor } from "@/data/api/error-messages";
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
  const [toAmount, setToAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listAccounts().then((accs) => {
      setAccounts(accs);
      setFromId(accs[0]?.id ?? null);
      setToId(accs[1]?.id ?? null);
    });
  }, []);

  const cents = parseCentsFromInput(amount);
  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount = accounts.find((a) => a.id === toId);
  const toIsCard = toAccount?.type === "credit_card";
  // Sin esto, transferir Q10 a una cuenta en dólares los acreditaba como
  // $10 — ninguna conversión (mismo bug que ya se arregló en el backend).
  const needsToAmount = !!fromAccount && !!toAccount && fromAccount.currency !== toAccount.currency;
  const toCents = needsToAmount ? parseCentsFromInput(toAmount) : cents;
  const canSave =
    cents !== null &&
    toCents !== null &&
    fromId !== null &&
    toId !== null &&
    fromId !== toId &&
    !busy;

  async function onSave() {
    if (cents === null || toCents === null || fromId === null || toId === null) return;
    setBusy(true);
    setError(null);
    try {
      await createTransferLocally({
        fromAccountId: fromId,
        toAccountId: toId,
        amountCents: cents,
        toAmountCents: needsToAmount ? toCents : undefined,
        date: today(),
        description: toIsCard ? "Pago de tarjeta" : null,
      });
      triggerSync();
      router.back();
    } catch (e) {
      setError(errorMessageFor(e, "No se pudo transferir."));
      setBusy(false);
    }
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
            {cents !== null
              ? `${new Money(cents, fromAccount?.currency).format()} →`
              : `${new Money(0, fromAccount?.currency).format()} →`}
          </Text>
          {needsToAmount && toCents !== null ? (
            <Text variant="title2" style={{ color: colors.transfer.fg }}>
              {new Money(toCents, toAccount?.currency).format()}
            </Text>
          ) : null}
        </View>

        <Input
          label={needsToAmount ? `Sale de ${fromAccount?.currency}` : undefined}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          autoFocus
          placeholder="Monto"
          style={{ textAlign: "center" }}
        />

        {needsToAmount ? (
          <Input
            label={`¿Cuánto llega en ${toAccount?.currency}?`}
            value={toAmount}
            onChangeText={setToAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            style={{ textAlign: "center" }}
          />
        ) : null}

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

        {error ? (
          <Text variant="caption" style={{ color: colors.danger.fg }}>
            {error}
          </Text>
        ) : null}

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={!canSave} />
      </ScrollView>
    </Screen>
  );
}
