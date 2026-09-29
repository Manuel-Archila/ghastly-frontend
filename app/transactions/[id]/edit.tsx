import { useCallback, useEffect, useState } from "react";
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
import {
  Chip,
  ChipGroup,
  DateField,
  FormScreen,
  Input,
  Notice,
  Screen,
  ScreenState,
} from "@/ui/primitives";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [txn, setTxn] = useState<TransactionListItem | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      await updateTransactionLocally(id, {
        categoryId,
        date,
        ...(amountEditable && amountCents !== null ? { amountCents } : {}),
        description: description.trim() || null,
        notes: notes.trim() || null,
      });
      triggerSync();
      router.back();
    } catch {
      setError("No se pudo guardar el cambio. Intentá de nuevo.");
      setBusy(false);
    }
  }, [id, categoryId, date, amountEditable, amountCents, amountValid, description, notes, router]);

  if (!txn) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Editar" }} />
        <ScreenState status="loading" skeleton="detail">{null}</ScreenState>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Editar" }} />
      <FormScreen
        error={error}
        submitLabel="Guardar"
        onSubmit={onSave}
        busy={busy}
        submitDisabled={!amountValid}
      >
        <ChipGroup label="Categoría">
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
            />
          ))}
        </ChipGroup>

        <DateField label="Fecha" value={date} onChange={setDate} />

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
            tone="info"
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
      </FormScreen>
    </>
  );
}
