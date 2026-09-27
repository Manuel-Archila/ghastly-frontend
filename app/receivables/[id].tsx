import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { errorMessageFor } from "@/data/api/error-messages";
import { deleteReceivable, settleReceivable, updateReceivable } from "@/data/api/receivables";
import { listAccounts, type Account } from "@/data/repositories/accounts";
import { pullChanges } from "@/data/sync";
import { Money, parseCentsFromInput } from "@/domain/money";
import { useInvalidateReceivables, useReceivables } from "@/features/receivables/useReceivables";
import { todayIso } from "@/lib/dates";
import { uuidv7 } from "@/lib/uuid";
import { confirmDestructive } from "@/ui/confirm";
import { Button, Chip, Input, Notice, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function ReceivableDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing } = useTokens();
  const { receivables, isLoading } = useReceivables();
  const invalidate = useInvalidateReceivables();
  const receivable = receivables.find((r) => r.id === id);

  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  // Un intento de liquidar = una llave de idempotencia y un id de ingreso;
  // se reutilizan en los reintentos del MISMO intento (misma cuenta y fecha).
  const attempt = useRef<{ signature: string; key: string; incomeId: string } | null>(null);

  useEffect(() => {
    void listAccounts().then(setAccounts);
  }, []);

  useEffect(() => {
    if (receivable && !seeded.current) {
      seeded.current = true;
      setCounterparty(receivable.counterparty);
      setAmount((receivable.amount_cents / 100).toFixed(2));
    }
  }, [receivable]);

  if (!receivable) {
    return (
      <Screen style={{ paddingTop: spacing[4] }}>
        <Stack.Screen options={{ title: "Me deben" }} />
        <Text variant="body" color="secondary">
          {isLoading ? "Cargando…" : "Ya no existe."}
        </Text>
      </Screen>
    );
  }

  const settled = receivable.status === "settled";

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await invalidate();
    } catch (e) {
      setError(errorMessageFor(e));
      // Si ya estaba liquidado en el servidor, la pantalla quedó vieja.
      if ((e as { code?: string }).code === "RECEIVABLE_ALREADY_SETTLED") await invalidate();
    }
    setBusy(false);
  }

  async function onSave() {
    const cents = parseCentsFromInput(amount);
    if (counterparty.trim() === "") return setError("Poné quién te debe.");
    if (cents === null || cents <= 0) return setError("Poné un monto mayor a cero.");
    await run(async () => {
      await updateReceivable(receivable!.id, { counterparty: counterparty.trim(), amount_cents: cents });
      router.back();
    });
  }

  async function onDelete() {
    const ok = await confirmDestructive(
      "Eliminar",
      `Se borra lo que te debe ${receivable!.counterparty}. El gasto original no cambia.`,
      "Eliminar",
    );
    if (!ok) return;
    await run(async () => {
      await deleteReceivable(receivable!.id);
      router.back();
    });
  }

  async function onSettle() {
    if (!accountId) return setError("Elegí en qué cuenta entró el dinero.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("La fecha va como AAAA-MM-DD.");
    const signature = `${accountId}|${date}`;
    if (attempt.current?.signature !== signature) {
      attempt.current = { signature, key: uuidv7(), incomeId: uuidv7() };
    }
    const { key, incomeId } = attempt.current;
    await run(async () => {
      await settleReceivable(
        receivable!.id,
        { id: incomeId, account_id: accountId, date },
        key,
      );
      attempt.current = null;
      await pullChanges().catch(() => {}); // trae el ingreso y el saldo nuevo
      router.back();
    });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: receivable.counterparty }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingVertical: spacing[4], paddingBottom: spacing[8] }}>
        <Text variant="display" style={{ fontVariant: ["tabular-nums"] }}>
          {new Money(receivable.amount_cents).format()}
        </Text>

        {settled ? (
          <View style={{ gap: spacing[2] }}>
            <Text variant="body" color="secondary">
              Liquidado{receivable.settled_at ? ` el ${receivable.settled_at.slice(0, 10)}` : ""}. Ya no se
              puede editar ni eliminar.
            </Text>
            {receivable.settlement_transaction_id ? (
              <Button
                label="Ver el ingreso"
                variant="secondary"
                onPress={() => router.push(`/transactions/${receivable.settlement_transaction_id}`)}
              />
            ) : null}
          </View>
        ) : null}

        <Input
          label="Quién te debe"
          value={counterparty}
          onChangeText={setCounterparty}
          editable={!settled}
        />
        <Input
          label="Monto"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          editable={!settled}
        />

        {error ? <Notice tone="danger" text={error} /> : null}

        <View style={{ gap: spacing[2] }}>
          <Button label="Guardar cambios" disabled={settled || busy} onPress={() => void onSave()} />
          <Button label="Eliminar" variant="danger" disabled={settled || busy} onPress={() => void onDelete()} />
        </View>

        {!settled ? (
          <View style={{ gap: spacing[3] }}>
            <Text variant="caption" color="secondary">
              LIQUIDAR (ME PAGARON)
            </Text>
            <Text variant="caption" color="tertiary">
              Crea un ingreso real en la cuenta que elijas. Necesita conexión.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  selected={accountId === a.id}
                  onPress={() => setAccountId(a.id)}
                />
              ))}
            </View>
            <Input label="Fecha" value={date} onChangeText={setDate} autoCapitalize="none" />
            <Button label="Liquidar" variant="secondary" disabled={busy} onPress={() => void onSettle()} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
