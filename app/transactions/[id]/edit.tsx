import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { listCategories, type Category } from "@/data/repositories/categories";
import {
  amountIsLocked,
  getTransaction,
  updateTransactionLocally,
  type TransactionListItem,
} from "@/data/repositories/transactions";
import { parseCentsFromInput } from "@/domain/money";
import { triggerSync } from "@/features/sync/sync-manager";
import { Button, Chip, Input, Notice, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing } = useTokens();

  const [txn, setTxn] = useState<TransactionListItem | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const t = await getTransaction(id);
      if (!t) return;
      setTxn(t);
      setCategoryId(t.categoryId);
      setDate(t.date);
      setAmount((t.amountCents / 100).toFixed(2));
      setDescription(t.description ?? "");
      setNotes(t.notes ?? "");
      setCategories(await listCategories(t.kind as "expense" | "income"));
    })();
  }, [id]);

  const amountCents = parseCentsFromInput(amount);
  const amountEditable = txn ? !amountIsLocked(txn) : false;
  const amountValid = !amountEditable || amountCents !== null;

  const onSave = useCallback(async () => {
    if (!amountValid) return;
    setBusy(true);
    await updateTransactionLocally(id, {
      categoryId,
      date,
      ...(amountEditable && amountCents !== null ? { amountCents } : {}),
      description: description.trim() || null,
      notes: notes.trim() || null,
    });
    triggerSync();
    router.back();
  }, [id, categoryId, date, amountEditable, amountCents, amountValid, description, notes, router]);

  if (!txn) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Editar" }} />
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Editar" }} />
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" color="secondary">
            Categoría
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
              />
            ))}
          </View>
        </View>

        <Input label="Fecha (YYYY-MM-DD)" value={date} onChangeText={setDate} />

        {amountEditable ? (
          <Input
            label={`Monto (${txn.currency})`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            error={amountValid ? undefined : "Monto inválido"}
          />
        ) : (
          <Notice
            text={
              txn.kind === "transfer"
                ? "El monto de una transferencia se edita desde sus dos cuentas."
                : txn.installmentId
                  ? "El monto lo define el plan de cuotas al que pertenece."
                  : "El monto ya quedó fijo al liquidar este cobro."
            }
          />
        )}

        <Input label="Descripción" value={description} onChangeText={setDescription} />
        <Input label="Notas" value={notes} onChangeText={setNotes} multiline />

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={busy || !amountValid} />
      </ScrollView>
    </Screen>
  );
}
