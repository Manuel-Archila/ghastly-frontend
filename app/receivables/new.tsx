import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { createReceivable } from "@/data/api/receivables";
import { errorMessageFor } from "@/data/api/error-messages";
import { getTransaction, type TransactionListItem } from "@/data/repositories/transactions";
import { runSync } from "@/data/sync";
import { Money, parseCentsFromInput } from "@/domain/money";
import { useInvalidateReceivables } from "@/features/receivables/useReceivables";
import { uuidv7 } from "@/lib/uuid";
import { Button, Input, Notice, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

/** "Dividir / me deben": anota cuánto le corresponde a otra persona de un gasto. */
export default function NewReceivableScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const router = useRouter();
  const { spacing } = useTokens();
  const invalidate = useInvalidateReceivables();

  const [txn, setTxn] = useState<TransactionListItem | undefined>();
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getTransaction(transactionId).then(setTxn);
  }, [transactionId]);

  async function onSave() {
    const cents = parseCentsFromInput(amount);
    if (counterparty.trim() === "") return setError("Poné quién te debe.");
    if (cents === null || cents <= 0) return setError("Poné un monto mayor a cero.");
    setBusy(true);
    setError(null);
    try {
      // El gasto tiene que existir en el servidor antes de colgarle una deuda.
      await runSync().catch(() => {});
      await createReceivable({
        id: uuidv7(),
        transaction_id: transactionId,
        counterparty: counterparty.trim(),
        amount_cents: cents,
      });
      await invalidate();
      router.back();
    } catch (e) {
      setError(errorMessageFor(e));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Dividir / me deben" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4] }}>
        {txn ? (
          <Text variant="body" color="secondary">
            Gasto de {new Money(txn.amountCents).format()}
            {txn.description ? ` · ${txn.description}` : ""}
          </Text>
        ) : null}
        <Input label="Quién te debe" value={counterparty} onChangeText={setCounterparty} />
        <Input
          label="Monto que le toca"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <View style={{ gap: spacing[2] }}>
          {error ? <Notice tone="danger" text={error} /> : null}
          <Button label={busy ? "Guardando…" : "Guardar"} onPress={() => void onSave()} disabled={busy} />
        </View>
      </ScrollView>
    </Screen>
  );
}
