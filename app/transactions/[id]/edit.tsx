import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { listCategories, type Category } from "@/data/repositories/categories";
import {
  getTransaction,
  updateTransactionLocally,
  type TransactionListItem,
} from "@/data/repositories/transactions";
import { triggerSync } from "@/features/sync/sync-manager";
import { Button, Chip, Input, Screen, Text } from "@/ui/primitives";
import { useTokens } from "@/ui/tokens";

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { spacing } = useTokens();

  const [txn, setTxn] = useState<TransactionListItem | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState("");
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
      setDescription(t.description ?? "");
      setNotes(t.notes ?? "");
      setCategories(await listCategories(t.kind as "expense" | "income"));
    })();
  }, [id]);

  const onSave = useCallback(async () => {
    setBusy(true);
    await updateTransactionLocally(id, {
      categoryId,
      date,
      description: description.trim() || null,
      notes: notes.trim() || null,
    });
    triggerSync();
    router.back();
  }, [id, categoryId, date, description, notes, router]);

  if (!txn) {
    return (
      <Screen style={{ paddingTop: spacing[5] }}>
        <Text variant="body" color="secondary">
          Cargando…
        </Text>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingTop: spacing[5] }}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[8] }}>
        <Text variant="title1">Editar</Text>

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
        <Input label="Descripción" value={description} onChangeText={setDescription} />
        <Input label="Notas" value={notes} onChangeText={setNotes} multiline />

        <Button label={busy ? "Guardando…" : "Guardar"} onPress={onSave} disabled={busy} />
      </ScrollView>
    </Screen>
  );
}
